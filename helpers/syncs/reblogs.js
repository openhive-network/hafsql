import { pool } from '../database.js'
import { clearUsername, validateAccountName } from '../validateUsername.js'

let accountCache = {}
let postCache = {}
let useCache = true

export const syncReblogs = async () => {
  useCache = false
  accountCache = {}
  postCache = {}
  const intervalTime = 3000
  setInterval(() => {
    fillReblogs(1000)
  }, intervalTime)
}

export const fillReblogs = async (limit = 30000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['reblogs']
  )
  start = start.rows[0].last_op_id
  let reblogs = await getReblogs(start, limit)
  while (reblogs.length > 0) {
    await insertReblogs(reblogs)
    start = reblogs.rows[reblogs.length - 1].op_id
    await updateLastOpId(start)
    reblogs = await getReblogs(start, limit)
  }
}

const getReblogs = async (start, limit = 10000) => {
  if (start < 16724280) {
    start = 16724280
  }
  const result = await pool.query(
    `SELECT op_id, json, required_posting_auths, id FROM hafsql."TxCustomJson"
      WHERE id IN($1,$2) AND op_id > $3 ORDER BY op_id ASC LIMIT $4`,
    ['follow', 'reblog', start, limit]
  )
  if (result.rowCount <= 0) {
    return []
  }
  const reblogsArray = []
  for (let i = 0; i < result.rowCount; i++) {
    const customJson = result.rows[i]
    try {
      let parsedJson = JSON.parse(customJson.json)
      const postingAuths = customJson.required_posting_auths
      if (!Array.isArray(parsedJson)) {
        if (typeof parsedJson !== 'object' || customJson.op_id > 27630458) {
          continue
        }
        parsedJson = [customJson.id, parsedJson]
      }
      if (parsedJson.length !== 2) {
        continue
      }
      if (parsedJson[0] !== 'follow' && parsedJson[0] !== 'reblog') {
        continue
      }
      if (typeof parsedJson[1] !== 'object') {
        continue
      }
      const keys = Object.keys(parsedJson[1])
      if (keys.length !== 3 && keys.length !== 4) {
        continue
      }
      if (
        !Object.hasOwn(parsedJson[1], 'account') ||
        !Object.hasOwn(parsedJson[1], 'author') ||
        !Object.hasOwn(parsedJson[1], 'permlink')
      ) {
        continue
      }
      const { account, author, permlink } = parsedJson[1]
      let remove = false
      if (Object.hasOwn(parsedJson[1], 'delete') && parsedJson[1].delete === 'delete') {
        remove = true
      }
      if (validateAccountName(clearUsername(account))) {
        continue
      }
      if (validateAccountName(clearUsername(author))) {
        continue
      }
      if (postingAuths[0] !== clearUsername(account)) {
        continue
      }
      if (typeof permlink !== 'string' || permlink.length > 256) {
        continue
      }
      const accountId = getUserId(account)
      if (!accountId) {
        continue
      }
      const postId = getPostId(author, permlink)
      if (!postId) {
        continue
      }
      reblogsArray.push({
        account: accountId,
        post: postId,
        remove,
        op_id: customJson.op_id
      })
    } catch (e) {
      continue
    }
  }
}

const insertReblogs = async (reblogs) => {
  const helperArray = []
  for (let i = 0; i < reblogs.length; i++) {
    const { account, post, remove } = reblogs[i]
    if (!remove) {
      helperArray.push({ account, post })
    } else {
      for (let k = 0; k < helperArray.length; k++) {
        if (account === helperArray[k].account && post === helperArray[k].post) {
          delete helperArray[k]
        }
      }
      await pool.query('DELETE FROM hafsql.reblogs_table WHERE account=$1 AND post=$2;', [account, post])
    }
  }
  let queryString = ''
  const params = []
  let first = true
  for (let i = 0; i < helperArray.length; i++) {
    const reblog = helperArray[i]
    if (!reblog) {
      continue
    }
    if (!first) {
      queryString += ','
    }
    queryString += `($${1 + i * 2}, $${2 + i * 2})`
    params.push(reblog.account, reblog.post)
    if (first) {
      first = false
    }
  }
  if (params.length > 0) {
    await pool.query(`INSERT INTO hafsql.reblogs_table (account, post) VALUES ${queryString};`, params)
  }
}

const getPostId = async (author, permlink) => {
  const postString = author + ';' + permlink
  if (useCache && Object.hasOwn(postCache, postString)) {
    return accountCache[postString]
  } else {
    const getId = await pool.query(
      'SELECT id FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
      [author, permlink]
    )
    if (getId.rowCount < 1) {
      return null
    }
    const id = getId.rows[0].id
    postCache[postString] = id
    return id
  }
}

// Caching ids for duration of the sync
const getUserId = async (username) => {
  if (useCache && Object.hasOwn(accountCache, username)) {
    return accountCache[username]
  } else {
    const getId = await pool.query(
      'SELECT a.id FROM hive.accounts a WHERE a.name=$1',
      [username]
    )
    if (getId.rowCount < 1) {
      return null
    }
    const id = getId.rows[0].id
    accountCache[username] = id
    return id
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'reblogs']
  )
}

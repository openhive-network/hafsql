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

export const fillReblogs = async (limit = 40000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['reblogs']
  )
  start = start.rows[0].last_op_id
  let reblogs = await getReblogs(start, limit)
  while (reblogs.length > 0) {
    await insertReblogs(reblogs)
    start = reblogs[reblogs.length - 1].op_id
    await updateLastOpId(start)
    reblogs = await getReblogs(start, limit)
  }
  accountCache = {}
  postCache = {}
}

const getReblogs = async (start, limit = 10000) => {
  if (start < BigInt('19622047718047744')) { // block 4568614
    start = BigInt('19622047718047744')
  }
  if (start < BigInt('25422748943646720')) { // block 5919195
    limit = 80000
  }
  const result = await pool.query(
    `SELECT op_id, json, required_posting_auths, id FROM hafsql.op_custom_json
      WHERE id IN('follow', 'reblog') AND op_id > $1 ORDER BY op_id ASC LIMIT $2`,
    [start, limit]
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
        if (typeof parsedJson !== 'object' || customJson.op_id > BigInt('25769795186065408')) { // block 5999998
          continue
        }
        parsedJson = [customJson.id, parsedJson]
      }
      if (parsedJson.length !== 2) {
        continue
      }
      if (parsedJson[0] !== 'reblog') {
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
      const accountId = await getUserId(account)
      if (!accountId) {
        continue
      }
      const postId = await getPostId(author, permlink)
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
  return reblogsArray
}

const insertReblogs = async (reblogs) => {
  const helperArray = []
  for (let i = 0; i < reblogs.length; i++) {
    const { account, post, remove } = reblogs[i]
    if (!remove) {
      helperArray.push({ account, post })
    } else {
      for (let k = 0; k < helperArray.length; k++) {
        if (!helperArray[k]) {
          continue
        }
        if (account === helperArray[k].account && post === helperArray[k].post) {
          delete helperArray[k]
        }
      }
      await pool.query('DELETE FROM hafsql.reblogs_table WHERE account=$1 AND post=$2;', [account, post])
    }
  }
  let queryString = ''
  let first = true
  for (let i = 0; i < helperArray.length; i++) {
    const reblog = helperArray[i]
    if (!reblog) {
      continue
    }
    if (!first) {
      queryString += ','
    }
    queryString += `(${reblog.account}, ${reblog.post})`
    if (first) {
      first = false
    }
  }
  if (queryString.length > 0) {
    await pool.query(`INSERT INTO hafsql.reblogs_table (account, post) VALUES ${queryString}
    ON CONFLICT ON CONSTRAINT hafsql_reblogs_table_un DO NOTHING;`)
  }
}

const getPostId = async (author, permlink) => {
  const postString = author + ';' + permlink
  if (useCache && Object.hasOwn(postCache, postString)) {
    return postCache[postString]
  } else {
    const getId = await pool.query(
      'SELECT id FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
      [author, permlink]
    )
    if (getId.rowCount < 1) {
      return null
    }
    const id = getId.rows[0].id
    if (useCache) {
      postCache[postString] = id
    }
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
    if (useCache) {
      accountCache[username] = id
    }
    return id
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'reblogs']
  )
}

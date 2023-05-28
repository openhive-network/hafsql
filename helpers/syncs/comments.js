import { pool } from '../database.js'
import DiffMatchPatch from 'diff-match-patch'

let commentsArray = []

export const syncComments = async () => {
  const intervalTime = 3000
  setInterval(() => {
    fillComments(1000)
  }, intervalTime)
}

// 65535 / 7 = ~9000
// postgres parameters limit = 65535
export const fillComments = async (limit = 9000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['comments']
  )
  start = start.rows[0].last_op_id
  let comments = await getComments(start, limit)
  while (comments.rowCount > 0) {
    await insertComments(comments.rows)
    start = comments.rows[comments.rowCount - 1].op_id
    await updateLastOpId(start)
    comments = await getComments(start, limit)
    // if (start > 5000000) {
    //   break
    // }
  }
}

const getComments = async (start, limit = 10000) => {
  return pool.query(
    `SELECT op_id, "timestamp", author, permlink, parent_author, parent_permlink, title, body, json_metadata
      FROM hafsql."TxComment" WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2`,
    [start, limit]
  )
}

const insertComments = async (items) => {
  commentsArray = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    // const { timestamp, author, permlink, title, body } = item
    // const opId = item.op_id
    // const parentAuthor = item.parent_author
    // const parentPermlink = item.parent_permlink
    item.bodyEdited = false
    const json = item.json_metadata
    item.tags = getTags(json)
    await commentsHelper(item)
  }
  let queryString = ''
  const params = []
  let first = true
  for (let i = 0; i < commentsArray.length; i++) {
    const comment = commentsArray[i]
    if (!first) {
      queryString += ','
    }
    const body = comment.bodyEdited ? comment.body : ''
    const N = 7
    queryString += `($${1 + N * i},$${2 + N * i},$${3 + N * i},$${4 + N * i},$${5 + N * i},$${6 + N * i},$${7 + N * i})`
    params.push(comment.author, comment.permlink, comment.op_id, comment.bodyEdited, JSON.stringify(body), JSON.stringify(comment.tags), comment.timestamp)
    if (first) {
      first = false
    }
  }
  if (params.length > 0) {
    await pool.query(`INSERT INTO hafsql.comments_table (author, permlink, last_op_id, body_edited, body, tags, created) VALUES ${queryString};`, params)
  }
}

const commentsHelper = async (item) => {
  try {
    for (let i = 0; i < commentsArray.length; i++) {
      if (
        commentsArray[i].author === item.author &&
        commentsArray[i].permlink === item.permlink
      ) {
        const oldBody = commentsArray[i].body
        if (item.body.length > 0 && item.body !== oldBody) {
          const editedBody = patchBody(oldBody, item.body)
          commentsArray[i].body = editedBody
          commentsArray[i].bodyEdited = true
        }
        commentsArray[i].op_id = item.op_id
        return
      }
    }
    const comment = await pool.query(
      'SELECT id, body_edited, last_op_id, body FROM hafsql.comments_table WHERE author=$1 AND permlink=$2;',
      [item.author, item.permlink]
    )
    if (comment.rowCount > 0) {
      let oldBody = ''
      if (comment.rows[0].body_edited === true) {
        oldBody = comment.rows[0].body
      }
      const temp = await pool.query('SELECT body FROM hafsql."TxComment" WHERE op_id=$1', [comment.rows[0].last_op_id])
      oldBody = temp.rows[0].body
      let extraQuery = ''
      const params = [JSON.stringify(item.tags), item.op_id, comment.rows[0].id]
      if (item.body.length > 0 && item.body !== oldBody) {
        const editedBody = patchBody(oldBody, item.body)
        extraQuery = ', body=$4, body_edited=$5'
        params.push(JSON.stringify(editedBody), true)
      }
      return pool.query(`UPDATE hafsql.comments_table SET tags=$1, last_op_id=$2 ${extraQuery}WHERE id=$3`, params)
    }
    commentsArray.push(item)
  } catch (e) {
    throw new Error(e)
  }
}

const getTags = (jsonMetadata) => {
  try {
    const temp = []
    if (typeof jsonMetadata === 'string' && jsonMetadata.length > 0) {
      const parsedJson = JSON.parse(jsonMetadata)
      if (Object.hasOwn(parsedJson, 'tags')) {
        const tags = parsedJson.tags
        if (Array.isArray(tags)) {
          for (let i = 0; i < tags.length; i++) {
            if (tags[i].length <= 24) {
              temp.push(tags[i])
            }
            if (i > 10) {
              break
            }
          }
        }
      }
    }
    return temp
  } catch {
    return []
  }
}

const patchBody = (oldBody, newBody) => {
  try {
    const dmp = new DiffMatchPatch()
    const patch = dmp.patch_fromText(newBody)
    const [temp] = dmp.patch_apply(patch, oldBody)
    return temp
  } catch {
    return newBody
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'comments']
  )
}

import { pool } from '../database.js'

let filling = true

export const syncDeleteComments = async () => {
  const intervalTime = 3000
  filling = false
  setInterval(() => {
    fillDeleteComments(1000)
  }, intervalTime)
}

export const fillDeleteComments = async (limit = 20000) => {
  if (filling) {
    await getIneffectiveDeleteComments()
  }
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['delete_comments']
  )
  start = start.rows[0].last_op_id
  let deletedCms = await getDeleteComments(start, limit)
  let i = 0
  while (deletedCms.rowCount > 0) {
    await insertDeleteComments(deletedCms.rows[i])
    i++
    if (i >= deletedCms.rowCount) {
      i = 0
      const start = deletedCms.rows[deletedCms.rowCount - 1].op_id
      await updateLastOpId(start)
      deletedCms = await getDeleteComments(start, limit)
    }
  }
}

const getDeleteComments = async (start, limit = 10000) => {
  return pool.query(
    `SELECT op_id, author, permlink FROM hafsql.op_delete_comment
      WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2`,
    [start, limit]
  )
}

const insertDeleteComments = async (deletedCm) => {
  const { author, permlink } = deletedCm
  if (!filling) {
    const result = await pool.query('SELECT * FROM hafsql.vo_ineffective_delete_comment WHERE author=$1 AND permlink=$2', [author, permlink])
    if (result.rowCount > 0) {
      return
    }
  } else {
    // Use cache when filling
    for (let i = 0; i < notDeletedComments.length; i++) {
      if (author === notDeletedComments[i].author && permlink === notDeletedComments[i].permlink) {
        return
      }
    }
  }
  return pool.query(
    'UPDATE hafsql.comments SET deleted=true WHERE author=$1 AND permlink=$2;',
    [author, permlink]
  )
}

let notDeletedComments = []
const getIneffectiveDeleteComments = async () => {
  const result = await pool.query('SELECT author, permlink FROM hafsql.vo_ineffective_delete_comment')
  if (result.rowCount > 0) {
    notDeletedComments = result.rows
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'delete_comments']
  )
}

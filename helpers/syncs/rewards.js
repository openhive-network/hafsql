import { pool } from '../database.js'

let cache = []

export const syncRewards = async () => {
  resetPaidPosts()
  const intervalTime = 3000
  setInterval(() => {
    fillRewards(1000)
  }, intervalTime)
}

const resetPaidPosts = () => {
  const intervalTime = 30000
  setInterval(async () => {
    const timer = Date.now()
    const lastPaid = await pool.query(
      'SELECT author, permlink FROM hafsql."VOCommentReward" ORDER BY op_id DESC LIMIT 1'
    )
    const startComment = await pool.query(
      'SELECT id FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
      [lastPaid.rows[0].author, lastPaid.rows[0].permlink]
    )
    const cmId = startComment.rows[0].id
    await pool.query('UPDATE hafsql.comments_table SET pending_payout_value=0 WHERE id<$1 AND pending_payout_value>0', [cmId])
    console.log('LOG: Reset took ' + (Date.now() - timer) + 'ms')
  }, intervalTime)
}

export const fillRewards = async (limit = 20000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['rewards']
  )
  start = start.rows[0].last_op_id
  const lastPaid = await pool.query(
    'SELECT author, permlink FROM hafsql."VOCommentReward" ORDER BY op_id DESC LIMIT 1'
  )
  const startComment = await pool.query(
    'SELECT op_id FROM hafsql."TxComment" WHERE author=$1 AND permlink=$2 ORDER BY op_id ASC LIMIT 1',
    [lastPaid.rows[0].author, lastPaid.rows[0].permlink]
  )
  const cmOpId = startComment.rows[0].op_id
  start = cmOpId > start ? cmOpId : start
  let rewards = await getRewards(start, limit)
  while (rewards.rowCount > 0) {
    await insertRewards(rewards.rows)
    start = rewards.rows[rewards.rowCount - 1].op_id
    await updateLastOpId(start)
    rewards = await getRewards(start, limit)
  }
}

const getRewards = async (start, limit = 10000) => {
  return pool.query(
    'SELECT op_id, author, permlink, pending_payout FROM hafsql."VOEffectiveCommentVote" WHERE op_id>$1 LIMIT $2',
    [start, limit]
  )
}

const insertRewards = async (rewards) => {
  cache = []
  for (let i = 0; i < rewards.length; i++) {
    const { author, permlink } = rewards[i]
    const pendingPayout = rewards[i].pending_payout
    let updated = false
    for (let k = 0; k < cache.length; k++) {
      if (cache[k].author === author && cache[k].permlink === permlink) {
        cache[k].pendingPayout = pendingPayout
        updated = true
        break
      }
    }
    if (updated) {
      continue
    }
    cache.push({ author, permlink, pendingPayout })
  }
  for (let k = 0; k < cache.length; k++) {
    await pool.query(
      'UPDATE hafsql.comments_table SET pending_payout_value=$1 WHERE author=$2 AND permlink=$3',
      [cache.pendingPayout, cache.author, cache.permlink]
    )
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'rewards']
  )
}

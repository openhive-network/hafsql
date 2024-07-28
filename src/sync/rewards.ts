import { pool } from '../helpers/database.ts'
import { print } from '../helpers/print.ts'
import { sleep } from '../helpers/sleep.ts'
import {
  AuthorPermlink,
  EffectiveCommentVote,
  LastOpId,
  PaidComments,
} from '../helpers/types.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Comment Rewards] Syncing alongside with comments 🟢')
      syncRewards()
    }
  }
}

let firstRun = true
export const syncRewards = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    resetPaidPosts()
  }
  fillPendingRewards(100000)
  // This updates more columns so we go a bit lighter
  fillPaidRewards(20000)
  await sleep(intervalTime)
  syncRewards()
}

let running1 = false
const fillPaidRewards = async (limit: number) => {
  if (running1) {
    return
  }
  running1 = true
  const client = await pool.connect()
  const startQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['paid_rewards'],
  )
  let start = startQ.rows[0].last_op_id
  client.release()
  let paidComments = await getPaidComments(start, limit)
  while (paidComments.length > 0) {
    await insertPaidRewards(paidComments)
    start = paidComments[paidComments.length - 1].op_id
    await updateLastOpIdPaid(start)
    paidComments = await getPaidComments(start, limit)
  }
  running1 = false
}

const getPaidComments = async (start: bigint, limit: number) => {
  using client = await pool.connect()
  const endQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['comments'],
  )
  const end = endQ.rows[0].last_op_id
  // Always lag behind the comments_table indexing
  const result = await client.queryObject<PaidComments>(
    `SELECT op_id, author, permlink, payout, author_rewards, total_payout_value, curator_payout_value, beneficiary_payout_value FROM hafsql.vo_comment_reward
      WHERE op_id > $1 AND op_id <= $2 ORDER BY op_id ASC LIMIT $3`,
    [start, end, limit],
  )
  return result.rows
}

let retry1 = 0
const insertPaidRewards = async (rewards: PaidComments[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('paid_rewards_sync')
  await trx.begin()
  try {
    for (let i = 0; i < rewards.length; i++) {
      const {
        author,
        permlink,
        author_rewards,
        beneficiary_payout_value,
        curator_payout_value,
        payout,
        total_payout_value,
      } = rewards[i]
      await trx.queryObject(
        `UPDATE hafsql.comments_table SET payout = payout + $1, author_rewards_hive = author_rewards_hive + $2,
          author_rewards_hbd = author_rewards_hbd + $3, curation_rewards = curation_rewards + $4,
          beneficiary_rewards = beneficiary_rewards + $5 WHERE author=$6 AND permlink=$7`,
        [
          payout,
          author_rewards,
          total_payout_value,
          curator_payout_value,
          beneficiary_payout_value,
          author,
          permlink,
        ],
      )
    }
    await trx.commit()
    retry1 = 0
  } catch (e) {
    // Because we are syncing concurrently we need to catch deadlocks and retry
    if (retry1 > 5) {
      throw new Error(e)
    }
    if (client.session.current_transaction) {
      await trx.rollback()
    }
    retry1++
    await sleep(2000)
    await insertPaidRewards(rewards)
  }
}

const updateLastOpIdPaid = async (opId: bigint) => {
  using client = await pool.connect()
  await client.queryObject(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'paid_rewards'],
  )
}

/**
 * ******* Pending Rewards Handling *******
 */

let running2 = false
// This starts syncing at the end of reindex near last week
const fillPendingRewards = async (limit: number) => {
  if (running2) {
    return
  }
  running2 = true
  const client = await pool.connect()
  const startQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['pending_rewards'],
  )
  let start = startQ.rows[0].last_op_id
  // Find last paid out post/comment
  const lastPaid = await client.queryObject<AuthorPermlink>(
    'SELECT author, permlink FROM hafsql.vo_comment_payout_update ORDER BY op_id DESC LIMIT 1',
  )
  if (lastPaid.rows.length <= 0) {
    return
  }
  // Get author & permlink of the last paid out post
  const startComment = await client.queryObject<{ op_id: bigint }>(
    'SELECT op_id FROM hafsql.op_comment WHERE author=$1 AND permlink=$2 ORDER BY op_id ASC LIMIT 1',
    [lastPaid.rows[0].author, lastPaid.rows[0].permlink],
  )
  client.release()
  const cmOpId = startComment.rows[0].op_id
  // Start syncing from the highest op_id
  start = cmOpId > start ? cmOpId : start
  let effectiveVotes = await getEffectiveVotes(start, limit)
  while (effectiveVotes.length > 0) {
    await insertPendingRewards(effectiveVotes)
    start = effectiveVotes[effectiveVotes.length - 1].op_id
    await updateLastOpIdPending(start)
    effectiveVotes = await getEffectiveVotes(start, limit)
  }
  running2 = false
}

const getEffectiveVotes = async (start: bigint, limit: number) => {
  using client = await pool.connect()
  const endQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['comments'],
  )
  const end = endQ.rows[0].last_op_id
  // Always lag behind the comments_table indexing
  const result = await client.queryObject<EffectiveCommentVote>(
    `SELECT op_id, author, permlink, pending_payout FROM hafsql.vo_effective_comment_vote
      WHERE op_id > $1 AND op_id <= $2 ORDER BY op_id ASC LIMIT $3`,
    [start, end, limit],
  )
  return result.rows
}

let retry2 = 0
const insertPendingRewards = async (rewards: EffectiveCommentVote[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('pending_rewards_sync')
  await trx.begin()
  try {
    for (let i = 0; i < rewards.length; i++) {
      const { author, permlink, pending_payout } = rewards[i]
      await trx.queryObject(
        'UPDATE hafsql.comments_table SET pending_payout_value=$1 WHERE author=$2 AND permlink=$3',
        [pending_payout, author, permlink],
      )
    }
    await trx.commit()
    retry2 = 0
  } catch (e) {
    // Because we are syncing concurrently we need to catch deadlocks and retry
    if (retry2 > 5) {
      throw new Error(e)
    }
    if (client.session.current_transaction) {
      await trx.rollback()
    }
    retry2++
    await sleep(2000)
    await insertPendingRewards(rewards)
  }
}

// Set pending_payout_value = 0 on paid out posts
// Every 3s
const resetPaidPosts = () => {
  const intervalTime = 3000
  setInterval(async () => {
    try {
      using client = await pool.connect()
      const lastPaid = await client.queryObject<AuthorPermlink>(
        'SELECT author, permlink FROM hafsql.vo_comment_payout_update ORDER BY op_id DESC LIMIT 1',
      )
      if (lastPaid.rows.length <= 0) {
        return
      }
      const startComment = await client.queryObject<{ id: number }>(
        'SELECT id FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
        [lastPaid.rows[0].author, lastPaid.rows[0].permlink],
      )
      if (startComment.rows.length <= 0) {
        return
      }
      const cmId = startComment.rows[0].id
      await client.queryObject(
        'UPDATE hafsql.comments_table SET pending_payout_value=0 WHERE id<=$1 AND pending_payout_value>0',
        [cmId],
      )
    } catch (_e) {
      // probably a deadlock - ignore
    }
    // takes 50-80ms
  }, intervalTime)
}

const updateLastOpIdPending = async (opId: bigint) => {
  using client = await pool.connect()
  await client.queryObject(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'pending_rewards'],
  )
}

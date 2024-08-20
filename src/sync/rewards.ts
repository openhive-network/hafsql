import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getLastBlockNum } from '../helpers/functions/get_last_block_num.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import {
  AuthorPermlink,
  BlockRange,
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
  fillPendingRewards()
  fillPaidRewards()
  await sleep(intervalTime)
  syncRewards()
}

let running1 = false
const fillPaidRewards = async () => {
  if (running1) {
    return
  }
  running1 = true
  let blockRange = await getBlockRange('paid_rewards')
  while (blockRange && (blockRange[1] - blockRange[0] > 0)) {
    const paidComments = await getPaidComments(blockRange)
    await insertPaidRewards(paidComments, blockRange)
    blockRange = await getBlockRange('paid_rewards')
  }
  running1 = false
}

const getPaidComments = async (blockRange: number[]) => {
  // Always lag behind the comments_table indexing
  const lastComment = await getLastBlockNum('comments')
  if (blockRange[0] > lastComment) {
    return []
  }
  if (blockRange[1] > lastComment) {
    blockRange[1] = lastComment
  }
  using client = await pool.connect()
  const result = await client.queryObject<PaidComments>(
    `SELECT op_id, author, permlink, payout, author_rewards, total_payout_value, curator_payout_value, beneficiary_payout_value FROM hafsql.vo_comment_reward
      WHERE op_id >= hafsql.last_op_id_from_block_num($1)
      AND op_id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY op_id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

let retry1 = 0
const insertPaidRewards = async (
  rewards: PaidComments[],
  blockRange: number[],
) => {
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
    await updateLastBlockNum('paid_rewards', blockRange[1], trx)
    await trx.commit()
    retry1 = 0
  } catch (e) {
    // Because we are syncing concurrently we need to catch deadlocks and retry
    if (retry1 > 5) {
      throw new Error(e)
    }
    retry1++
    await sleep(2000)
    return insertPaidRewards(rewards, blockRange)
  }
}

/**
 * ******* Pending Rewards Handling *******
 */

let running2 = false
// This starts syncing at the end of reindex near last week
const fillPendingRewards = async () => {
  if (running2) {
    return
  }
  running2 = true
  const client = await pool.connect()
  // Find last paid post/comment
  const lastPaid = await client.queryObject<AuthorPermlink>(
    'SELECT author, permlink FROM hafsql.vo_comment_payout_update ORDER BY op_id DESC LIMIT 1',
  )
  // Get block_num of the last paid post
  const startComment = await client.queryObject<{ block_num: number }>(
    'SELECT block_num FROM hafsql.op_comment WHERE author=$1 AND permlink=$2 ORDER BY op_id ASC LIMIT 1',
    [lastPaid.rows[0].author, lastPaid.rows[0].permlink],
  )
  client.release()
  const cmBlockNum = startComment.rows[0].block_num
  const commentsLastBlockNum = await getLastBlockNum('comments')
  // wait for comments_table to sync first
  if (cmBlockNum > commentsLastBlockNum) {
    return
  }
  let blockRange = await getBlockRange('pending_rewards')
  if (!blockRange) {
    return
  }
  await client.connect()
  // start range should be higher than the last paid post
  if (cmBlockNum > blockRange[0]) {
    await updateLastBlockNum('pending_rewards', cmBlockNum, client)
    blockRange = await getBlockRange('pending_rewards')
    if (!blockRange) {
      return
    }
  }
  client.release()

  while (blockRange && (blockRange[1] - blockRange[0] > 0)) {
    const effectiveVotes = await getEffectiveVotes(blockRange)
    await insertPendingRewards(effectiveVotes, blockRange)
    blockRange = await getBlockRange('pending_rewards')
  }
  running2 = false
}

const getEffectiveVotes = async (blockRange: number[]) => {
  using client = await pool.connect()
  // Always lag behind the comments_table indexing
  const end = await getLastBlockNum('comments')
  if (blockRange[0] > end) {
    return []
  }
  if (blockRange[1] > end) {
    blockRange[1] = end
  }
  const result = await client.queryObject<EffectiveCommentVote>(
    `SELECT op_id, author, permlink, pending_payout FROM hafsql.vo_effective_comment_vote
      WHERE op_id >= hafsql.last_op_id_from_block_num($1)
      AND op_id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY op_id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

let retry2 = 0
const insertPendingRewards = async (
  rewards: EffectiveCommentVote[],
  blockRange: number[],
) => {
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
    await updateLastBlockNum('pending_rewards', blockRange[1], trx)
    await trx.commit()
    retry2 = 0
  } catch (e) {
    // Because we are syncing concurrently we need to catch deadlocks and retry
    if (retry2 > 5) {
      throw new Error(e)
    }
    retry2++
    await sleep(2000)
    return insertPendingRewards(rewards, blockRange)
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

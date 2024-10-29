import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getLastBlockNum } from '../helpers/functions/get_last_block_num.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import { AuthorPermlink, EffectiveCommentVote } from '../helpers/types.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Pending Rewards] Syncing alongside with comments 🟢')
      syncRewards()
    }
  }
}

let firstRun = true
export const syncRewards = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
  }
  await resetPaidPosts()
  await fillPendingRewards()
  await sleep(intervalTime)
  syncRewards()
}

// This starts syncing at the end of reindex near last week
const fillPendingRewards = async () => {
  const client = await pool.connect()
  // Find last paid post/comment
  const lastPaid = await client.queryObject<AuthorPermlink>(
    'SELECT author, permlink FROM hafsql.operation_comment_payout_update_table ORDER BY id DESC LIMIT 1',
  )
  // Get block_num of the last paid post
  const startComment = await client.queryObject<{ block_num: number }>(
    'SELECT block_num FROM hafsql.operation_comment_view WHERE author=$1 AND permlink=$2 ORDER BY id ASC LIMIT 1',
    [lastPaid.rows[0].author, lastPaid.rows[0].permlink],
  )
  const cmBlockNum = startComment.rows[0].block_num
  const commentsLastBlockNum = await getLastBlockNum('comments', client)
  // wait for comments_table to sync first
  if (cmBlockNum > commentsLastBlockNum) {
    client.release()
    return
  }
  let blockRange = await getBlockRange('pending_rewards', client)
  if (!blockRange) {
    client.release()
    return
  }
  // start range should be higher than the last paid post
  if (cmBlockNum > blockRange[0]) {
    await updateLastBlockNum('pending_rewards', cmBlockNum, client)
    blockRange = await getBlockRange('pending_rewards', client)
    if (!blockRange) {
      client.release()
      return
    }
  }
  client.release()

  while (blockRange) {
    const effectiveVotes = await getEffectiveVotes(blockRange)
    await insertPendingRewards(effectiveVotes, blockRange)
    blockRange = await getBlockRange('pending_rewards')
  }
}

const getEffectiveVotes = async (blockRange: number[]) => {
  using client = await pool.connect()
  // Always lag behind the comments_table indexing
  const end = await getLastBlockNum('comments')
  if (blockRange[0] > end) {
    blockRange[0] = end
    blockRange[1] = end
    return []
  }
  if (blockRange[1] > end) {
    blockRange[1] = end
  }
  const result = await client.queryObject<EffectiveCommentVote>(
    `SELECT author, permlink, pending_payout FROM hafsql.operation_effective_comment_vote_view
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

const insertPendingRewards = async (
  rewards: EffectiveCommentVote[],
  blockRange: number[],
) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_pending_rewards_sync')
  await trx.begin()
  try {
    for (let i = 0; i < rewards.length; i++) {
      await trx.queryArray(
        'UPDATE hafsql.comments_table SET pending_payout_value=$1 WHERE author=$2 AND permlink=$3',
        [rewards[i].pending_payout, rewards[i].author, rewards[i].permlink],
      )
    }
    await updateLastBlockNum('pending_rewards', blockRange[1], trx)
    await trx.commit()
    // deno-lint-ignore no-explicit-any
  } catch (e: any) {
    // Because we are syncing concurrently we need to catch deadlocks and retry
    if (e.cause?.message === 'deadlock detected') {
      console.log('deadlock pending')
      await sleep(5000)
      return insertPendingRewards(rewards, blockRange)
    } else {
      print(e)
      throw new Error(e)
    }
  }
}

// Set pending_payout_value = 0 on paid out posts
// Every 3s
const resetPaidPosts = async () => {
  using client = await pool.connect()
  try {
    const lastPaid = await client.queryObject<AuthorPermlink>(
      'SELECT author, permlink FROM hafsql.operation_comment_payout_update_table ORDER BY id DESC LIMIT 1',
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
    console.log(_e)
    // probably a deadlock - ignore
  }
}

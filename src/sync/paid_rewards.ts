import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getLastBlockNum } from '../helpers/functions/get_last_block_num.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import { PaidComments } from '../helpers/types.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Paid Rewards] Syncing alongside with comments 🟢')
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
  await fillPaidRewards()
  await sleep(intervalTime)
  syncRewards()
}

const fillPaidRewards = async () => {
  let blockRange = await getBlockRange('paid_rewards')
  while (blockRange) {
    const paidComments = await getPaidComments(blockRange)
    await insertPaidRewards(paidComments, blockRange)
    blockRange = await getBlockRange('paid_rewards')
  }
}

const getPaidComments = async (blockRange: number[]) => {
  // Always lag behind the comments_table indexing
  const lastComment = await getLastBlockNum('comments')
  if (blockRange[0] > lastComment) {
    blockRange[0] = lastComment
    blockRange[1] = lastComment
    return []
  }
  if (blockRange[1] > lastComment) {
    blockRange[1] = lastComment
  }
  using client = await pool.connect()
  const result = await client.queryObject<PaidComments>(
    `SELECT op_id, author, permlink, payout, author_rewards, total_payout_value, curator_payout_value, beneficiary_payout_value FROM hafsql.vo_comment_reward
      WHERE op_id >= hafsql.first_op_id_from_block_num($1)
      AND op_id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY op_id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

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
  } catch (e) {
    // Because we are syncing concurrently we need to catch deadlocks and retry
    if (e.cause?.message === 'deadlock detected') {
      console.log('deadlock paid')
      await sleep(5000)
      return insertPaidRewards(rewards, blockRange)
    } else {
      print(e)
      throw new Error(e)
    }
  }
}

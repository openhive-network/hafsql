import { Transaction } from '../deps.ts'
import { pool } from '../helpers/database.ts'
import { getUserId } from '../helpers/functions/get_user_id.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import {
  BlockRange,
  EffectiveCommentVoteREP,
  Reputation,
} from '../helpers/types.ts'
import { createReputationsIndexes } from '../indexes/hafsql.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Reputations] Start massive sync... ⏳')
      syncReputations()
    }
  }
}

let firstRun = true
const syncReputations = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    print('[Reputations] Setting up the table... ⏳')
    await fillAccounts()
    print('[Reputations] Table setup done ✅')
    await fillReputations()
    print('[Reputations] Massive sync done ✅')
    await createReputationsIndexes()
    print('[Reputations] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillReputations()
  await sleep(intervalTime)
  syncReputations()
}

let firstRunFillAccounts = true
/**
 * Fill the reputations table with the account ids from hive.accounts
 * And keep adding them on live sync
 */
const fillAccounts = async () => {
  using client = await pool.connect()
  const lastAccountQ = await client.queryObject<{ account: number }>(
    `SELECT account FROM hafsql.reputations_table ORDER BY account DESC LIMIT 1`,
  )
  let lastAccount = 0
  if (lastAccountQ.rows.length > 0) {
    lastAccount = lastAccountQ.rows[0].account
  }
  const lastNewAccountQ = await client.queryObject<{ id: number }>(
    `SELECT id FROM hive.accounts ORDER BY id DESC LIMIT 1`,
  )
  const lastNewAccount = lastNewAccountQ.rows[0].id
  if (lastNewAccount > lastAccount) {
    await client.queryObject(
      `INSERT INTO hafsql.reputations_table (account) SELECT id FROM hive.accounts WHERE id > $1`,
      [lastAccount],
    )
  }
  if (firstRunFillAccounts) {
    firstRunFillAccounts = false
    setInterval(fillAccounts, 1000)
  }
}

const fillReputations = async () => {
  let blockRange = await getBlockRange()
  while (blockRange && (blockRange[1] - blockRange[0] > 0)) {
    const votes = await getVotes(blockRange)
    await processVotes(votes, blockRange)
    blockRange = await getBlockRange()
  }
}

const getBlockRange = async () => {
  using client = await pool.connect()
  const blockRangeQ = await client.queryObject<BlockRange>(
    'SELECT hafsql.get_next_block_range($1) as block_range;',
    ['reputations'],
  )
  if (blockRangeQ.rows.length < 1) {
    return null
  }
  return blockRangeQ.rows[0].block_range
}

const getVotes = async (blockRange: number[]) => {
  using client = await pool.connect()
  const result = await client.queryObject<EffectiveCommentVoteREP>(
    `SELECT op_id, voter, author, permlink, rshares FROM hafsql.vo_effective_comment_vote
      WHERE op_id >= hafsql.first_op_id_from_block_num($1)
      AND op_id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY op_id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

const processVotes = async (
  votes: EffectiveCommentVoteREP[],
  blockRange: number[],
) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_reputations_sync')
  await trx.begin()
  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i]
    const voterId = <number> await getUserId(vote.voter)
    const voterRep = await getUserRep(voterId, trx)
    // Rule #1: Must have non-negative reputation to effect another user's reputation
    if (voterRep.reputation < 0) {
      continue
    }
    const authorId = <number> await getUserId(vote.author)
    const authorRep = await getUserRep(authorId, trx)
    let rshares = BigInt(0)
    // Throw away the last 6 digits - it is noise per original code
    rshares = rsharesToBI(vote.rshares)
    // Case study:
    // A upvotes B and B gets more reputations than A
    // A wants to change the upvote to downvote - can't affect the reputation
    // So we must remove the affect of A's upvote first before Rule #2
    const prevRshares = await getPrevRshares(
      vote.voter,
      vote.author,
      vote.permlink,
      vote.op_id,
      trx,
    )
    if (prevRshares > 0) {
      authorRep.reputation -= prevRshares
    }
    // Rule #2: If you are down voting another user, you must have more reputation than them to impact their reputation
    // Rule #3: Must be explicit for downvotes
    // TODO: There is room for improvement - HIGHREP idea from @gtg
    if (
      rshares < 0 && !voterRep.is_implicit &&
      voterRep.reputation < authorRep.reputation
    ) {
      continue
    }

    if (authorRep.is_implicit) {
      // make it explicit
      await trx.queryObject(
        `UPDATE hafsql.reputations_table SET reputation = reputation + $1 - $2, is_implicit=$3
          WHERE account=$4`,
        [rshares, prevRshares, false, authorId],
      )
    } else {
      await trx.queryObject(
        `UPDATE hafsql.reputations_table SET reputation = reputation + $1 - $2
          WHERE account=$3`,
        [rshares, prevRshares, authorId],
      )
    }
  }
  await updateLastBlockNum('reputations', blockRange[1], trx)
  await trx.commit()
}

// Get previous vote of the voter on the certain post - 0 if none
const getPrevRshares = async (
  voter: string,
  author: string,
  permlink: string,
  op_id: bigint,
  trx: Transaction,
) => {
  const result = await trx.queryObject<{ rshares: string }>(
    `SELECT rshares FROM hafsql.vo_effective_comment_vote
      WHERE voter=$1 AND author=$2 AND permlink=$3
      AND op_id < $4
      ORDER BY op_id DESC
      LIMIT 1`,
    [voter, author, permlink, op_id],
  )
  if (result.rows.length < 1) {
    return BigInt(0)
  }
  const rshares = result.rows[0].rshares
  return rsharesToBI(rshares)
}

const rsharesToBI = (rshares: string) => {
  if (
    rshares.length > 6 && !rshares.startsWith('-') ||
    rshares.length > 7 && rshares.startsWith('-')
  ) {
    return BigInt(rshares.slice(0, -6))
  }
  return BigInt(0)
}

const getUserRep = async (userId: number, trx: Transaction) => {
  const getRep = await trx.queryObject<Reputation>(
    'SELECT reputation, is_implicit FROM hafsql.reputations_table WHERE account=$1',
    [userId],
  )
  const reputation = BigInt(getRep.rows[0].reputation)
  return {
    reputation,
    is_implicit: getRep.rows[0].is_implicit,
  }
}

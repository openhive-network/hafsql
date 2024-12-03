import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { getUserId } from '../helpers/utils/get_user_id.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { EffectiveCommentVoteREP, Reputation } from '../helpers/types.ts'
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
    await fillCache()
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

/**
 * Fill the reputations table with the account ids from hafd.accounts
 * And keep adding them on live sync
 */
const prepareTable = async () => {
  using client = await pool.connect()
  const lastAccountQ = await client.queryObject<{ account: number }>(
    `SELECT account FROM hafsql.reputations_table ORDER BY account DESC LIMIT 1`,
  )
  let lastAccount = -1
  if (lastAccountQ.rows.length > 0) {
    lastAccount = lastAccountQ.rows[0].account
  }
  const lastNewAccountQ = await client.queryObject<{ id: number }>(
    `SELECT id FROM hafd.accounts ORDER BY id DESC LIMIT 1`,
  )
  const lastNewAccount = lastNewAccountQ.rows[0].id
  if (lastNewAccount > lastAccount) {
    await client.queryObject(
      `INSERT INTO hafsql.reputations_table (account) SELECT id FROM hafd.accounts WHERE id > $1`,
      [lastAccount],
    )
  }
}

let massiveSync = true
const fillReputations = async () => {
  let blockRange = await getBlockRange('reputations')
  if (!blockRange) {
    return
  }
  if (blockRange[1] - blockRange[0] < 49999) {
    massiveSync = false
  }
  while (blockRange) {
    await prepareTable()
    await fillFakeTable()
    const votes = await getVotes(blockRange)
    await processVotes(votes, blockRange)
    await cleanTheCache(blockRange)
    if (massiveSync) {
      await processFakeTable(blockRange)
    }
    blockRange = await getBlockRange('reputations')
  }
}

const getVotes = async (blockRange: number[]) => {
  using client = await pool.connect()
  const result = await client.queryObject<EffectiveCommentVoteREP>(
    `SELECT id, voter, author, permlink, rshares, timestamp FROM hafsql.operation_effective_comment_vote_view
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

const processVotes = async (
  votes: EffectiveCommentVoteREP[],
  blockRange: number[],
) => {
  let client, trx
  if (!massiveSync) {
    client = await pool.connect()
    trx = client.createTransaction('hafsql_reputations_sync')
    await trx.begin()
  }
  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i]
    // Case study:
    // A upvotes B and B gets more reputations than A
    // A wants to change the upvote to downvote - can't affect the reputation
    // So we must remove the affect of A's upvote first before Rule #2
    // get this before inserting into the cache
    const prevRshares = await getPrevRshares(
      vote.voter,
      vote.author,
      vote.permlink,
      vote.id,
    )
    // Throw away the last 6 digits - it is noise per original code
    const rshares = rsharesToBI(vote.rshares)
    if (massiveSync) {
      // Insert into cache before everything else to have consistent reputation across all runs
      const cacheKey = vote.voter + ';' + vote.author + ';' + vote.permlink
      cache[cacheKey] = {
        rshares,
        timestamp: new Date(vote.timestamp + 'Z').getTime(),
      }
    }
    const voterId = <number> await getUserId(vote.voter)
    const voterRep = massiveSync
      ? fakeTable[voterId]
      : await getUserRep(voterId)
    // Rule #1: Must have non-negative reputation to effect another user's reputation
    if (voterRep.reputation < 0) {
      continue
    }
    const authorId = <number> await getUserId(vote.author)
    const authorRep = massiveSync
      ? fakeTable[authorId]
      : await getUserRep(authorId)
    // Get the value so we don't actually modify the fakeTable
    let literalRep = authorRep.reputation
    if (prevRshares > 0) {
      literalRep -= prevRshares
    }
    // Rule #2: If you are down voting another user, you must have more reputation than them to impact their reputation
    // Rule #3: Must be explicit for downvotes
    // TODO: There is room for improvement - HIGHREP idea from @gtg
    if (rshares < 0) {
      if (voterRep.is_implicit) {
        continue
      }
      if (voterRep.reputation < literalRep) {
        continue
      }
    }
    if (massiveSync) {
      // Update fakeTable
      if (prevRshares > 0) {
        authorRep.reputation -= prevRshares
      }
      authorRep.reputation += rshares
      authorRep.updated = true
      if (authorRep.is_implicit) {
        authorRep.is_implicit = false
      }
    } else {
      if (authorRep.is_implicit) {
        await trx?.queryObject(
          `UPDATE hafsql.reputations_table SET reputation = $1, is_implicit=$2
            WHERE account=$3`,
          [authorRep.reputation + rshares, false, authorId],
        )
      } else {
        await trx?.queryObject(
          `UPDATE hafsql.reputations_table SET reputation = $1 WHERE account=$2`,
          [authorRep.reputation + rshares, authorId],
        )
      }
    }
  }
  if (!massiveSync && trx) {
    await updateLastBlockNum('reputations', blockRange[1], trx)
    await trx.commit()
    client?.release()
  }
}

const getUserRep = async (userId: number) => {
  using client = await pool.connect()
  const getRep = await client.queryObject<Reputation>(
    'SELECT reputation, is_implicit FROM hafsql.reputations_table WHERE account=$1',
    [userId],
  )
  const reputation = BigInt(getRep.rows[0].reputation)
  return {
    reputation,
    is_implicit: getRep.rows[0].is_implicit,
    updated: true, // for ts typing sake
  }
}

// Get previous vote of the voter on the certain post - 0 if none
const getPrevRshares = async (
  voter: string,
  author: string,
  permlink: string,
  id: bigint,
) => {
  if (massiveSync) {
    const cacheKey = voter + ';' + author + ';' + permlink
    if (Object.hasOwn(cache, cacheKey)) {
      return cache[cacheKey].rshares
    }
    return BigInt(0)
  } else {
    using client = await pool.connect()
    const result = await client.queryObject<{ rshares: string }>(
      `SELECT rshares FROM hafsql.operation_effective_comment_vote_view
        WHERE voter=$1 AND author=$2 AND permlink=$3
        AND id < $4
        ORDER BY id DESC
        LIMIT 1`,
      [voter, author, permlink, id],
    )
    if (result.rows.length < 1) {
      return BigInt(0)
    }
    const rshares = result.rows[0].rshares
    return rsharesToBI(rshares)
  }
}

const rsharesToBI = (rshares: string) => {
  return BigInt(rshares) >> 6n
}

// only used during massiveSync
const processFakeTable = async (blockRange: number[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_reputations_sync')
  await trx.begin()
  for (let i = 0; i < fakeTable.length; i++) {
    if (!fakeTable[i].updated) {
      continue
    }
    const account = i
    const { is_implicit, reputation } = fakeTable[i]
    await trx.queryObject(
      `UPDATE hafsql.reputations_table SET reputation = $1, is_implicit=$2
        WHERE account=$3`,
      [reputation, is_implicit, account],
    )
  }
  await updateLastBlockNum('reputations', blockRange[1], trx)
  await trx.commit()

  // If the above transaction fails and rolls back we can't rollback faketables
  // so we have to do this after making sure the transaction is committed
  for (let i = 0; i < fakeTable.length; i++) {
    if (fakeTable[i].updated) {
      fakeTable[i].updated = false
    }
  }
}

// only used during massiveSync
// Using cache to speedup the sync - index is the account id
let fakeTable: {
  reputation: bigint
  is_implicit: boolean
  updated: boolean
}[] = []
const fillFakeTable = async () => {
  if (!massiveSync) {
    fakeTable = []
    return
  }
  using client = await pool.connect()
  const lastId = fakeTable.length - 1
  const result = await client.queryObject<Reputation>(
    `SELECT account, reputation, is_implicit FROM hafsql.reputations_table WHERE account > $1 ORDER BY account ASC`,
    [lastId],
  )
  result.rows.forEach((row) => {
    fakeTable[row.account] = {
      reputation: BigInt(row.reputation),
      is_implicit: row.is_implicit,
      updated: false,
    }
  })
}

// only used during massiveSync
// hardfork 17 at 10629455 and hf19 at 12988978
// max cashout window pre_hf17 = 30 days
// but might have comments till hf19
const HF19 = 12988978
let cache: Record<string, { rshares: bigint; timestamp: number }> = {}
const fillCache = async () => {
  // This is run once at the start
  const blockRange = await getBlockRange('reputations')
  if (!blockRange) {
    return
  }
  // don't need to fill cache if not massive sync
  if (blockRange[1] - blockRange[0] < 49999) {
    return
  }
  let maxAge = 604800000 // ms 7days
  if (blockRange[0] <= HF19) {
    maxAge = 2592000000 // ms 30days
  }
  if (blockRange[0] === 1) {
    // no need to fill cache - nothing to fill
  } else {
    const timestamp = await getTimestamp(blockRange[0] - 1)
    const firstNum = await getBlockNum(timestamp - maxAge)
    const votes = await getVotes([firstNum, blockRange[0] - 1])
    votes.forEach((item) => {
      const cacheKey = item.voter + ';' + item.author + ';' + item.permlink
      cache[cacheKey] = {
        rshares: rsharesToBI(item.rshares),
        timestamp: new Date(item.timestamp + 'Z').getTime(),
      }
    })
  }
}
// only used during massiveSync
const getTimestamp = async (blockNum: number) => {
  using client = await pool.connect()
  const result = await client.queryObject<{ created_at: string }>(
    `SELECT created_at FROM hafd.blocks WHERE num=$1`,
    [blockNum],
  )
  return new Date(result.rows[0].created_at + 'Z').getTime()
}
// only used during massiveSync
const getBlockNum = async (timestamp: number) => {
  using client = await pool.connect()
  const result = await client.queryObject<{ num: number }>(
    `SELECT num FROM hafd.blocks WHERE created_at <= $1
      ORDER BY created_at DESC LIMIT 1`,
    [new Date(timestamp).toISOString()],
  )
  if (result.rows.length < 1) {
    return 1
  }
  return result.rows[0].num
}
// only used during massiveSync
const cleanTheCache = async (blockRange: number[]) => {
  if (!massiveSync) {
    cache = {}
    return
  }
  let maxAge = 604800000 // ms 7days
  if (blockRange[1] <= HF19) {
    maxAge = 2592000000 // ms 30days
  }
  const timeOfBlock = await getTimestamp(blockRange[1])
  const lastTime = timeOfBlock - maxAge
  for (const i in cache) {
    if (cache[i].timestamp < lastTime) {
      delete cache[i]
    }
  }
}

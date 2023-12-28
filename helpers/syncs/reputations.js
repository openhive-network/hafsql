import { pool } from '../database.js'

let accountCache = {}
// let repCache = {}
// let voteCache = {} // [voter, shares, timestamp]
let useCache = true
let lastVoteTimestamp = 0
let client = null // filled in setupTempTables()

export const syncReputations = async () => {
  useCache = false
  accountCache = {}
  // repCache = {}
  // voteCache = {}
  await client.release(true)
  const intervalTime = 3000
  setInterval(() => {
    fillReputations(1000)
  }, intervalTime)
}

// syncing reputations from last 365 days
// reputation decays over 365 days to 0
export const fillReputations = async (limit = 20000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['reputations']
  )
  start = Number(start.rows[0].last_op_id)

  let opIdFrom1WeekAgo = 0
  if (useCache) {
    await setupTempTables()
    // get last op id from 1 week ago
    const t = await pool.query(`SELECT x.id FROM hive.operations x where timestamp < now() - interval '1week'
      order by timestamp desc
      limit 1`)
    opIdFrom1WeekAgo = Number(t.rows[0].id)

    if (start >= opIdFrom1WeekAgo) {
      // don't use cache if already in recent votes
      useCache = false
    }
    // get last op id from a year ago
    const t2 = await pool.query(`SELECT x.id FROM hive.operations x where timestamp < now() - interval '1year'
      order by timestamp desc
      limit 1`)
    if (start === 0) {
    // start = op_id from 365 days ago
      start = Number(t2.rows[0].id)
    }
  }
  let votes = await getVotes(start, limit)
  if (useCache) {
    // if syncing don't go to recent votes - instead use the cache table for recent votes
    while (votes.rowCount > 0 && start < opIdFrom1WeekAgo) {
      await processVotes(votes.rows)
      start = Number(votes.rows[votes.rowCount - 1].op_id)
      await updateLastOpId(start)
      console.log('processed ' + start + '')
      votes = await getVotes(start, limit)
    }
  } else {
    // we come here only after sync
    while (votes.rowCount > 0) {
      await processVotes(votes.rows)
      start = Number(votes.rows[votes.rowCount - 1].op_id)
      await updateLastOpId(start)
      votes = await getVotes(start, limit)
    }
  }
  // if during sync
  // if (useCache) {
  //   await insertReputationsAfterSync()
  //   await updateLastOpId(start)
  // }
}

const getVotes = async (start, limit = 10000) => {
  return pool.query(
    `SELECT x.op_id, x.voter, x.author, x.permlink, x.rshares, x.timestamp FROM hafsql.vo_effective_comment_vote x
      WHERE x.op_id > $1 ORDER BY x.op_id ASC LIMIT $2`,
    [start, limit]
  )
}

const processVotes = async (votes) => {
  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i]
    // const postStr = vote.author + vote.permlink
    const authorId = await getUserId(vote.author)
    const voterId = await getUserId(vote.voter)
    // const cacheIndex = voterId + ';' + postStr
    const timestamp = new Date(vote.timestamp + 'Z').getTime()
    const userRep = await getUserRep(authorId)
    const userReputation = userRep[0]
    const lastUpdate = userRep[1]

    // multiplier is (0,1) including floats and we can't multiplie bigint by a float
    // We *1000 then /1000 to apply multiplier
    let multiplier = 1 - (timestamp - lastUpdate) / 31536000000
    if (multiplier < 0) {
      multiplier = 0
    }
    multiplier = Math.floor(multiplier * 1000)
    lastVoteTimestamp = timestamp

    const postId = await getPostId(vote.author, vote.permlink)
    if (!postId) {
      continue
    }
    const voteCache = await getVoteCache(voterId, postId)
    if (voteCache === null) {
      await setVoteCache(voterId, postId, vote.rshares, timestamp)
      const rep = BigInt(userReputation) * BigInt(multiplier) / 1000n + BigInt(vote.rshares)
      await setUserRep(authorId, rep, timestamp)
    } else {
      const rep = BigInt(userReputation) * BigInt(multiplier) / 1000n + BigInt(vote.rshares) - BigInt(voteCache)
      await setUserRep(authorId, rep, timestamp)
      await setVoteCache(voterId, postId, vote.rshares, timestamp)
    }
  }
}

// we bulk insert the reputations from cache after sync is done
// has to be in batches - postgres param limit = 65k
// const insertReputationsAfterSync = async () => {
//   let params = [[], [], []]
//   let i = 1
//   for (const userId in repCache) {
//     params[0].push(userId)
//     params[1].push(repCache[userId][0])
//     params[2].push(repCache[userId][1])
//     i++
//     if (i >= 20000) {
//       await bulkInsert(params)
//       params = [[], [], []]
//       i = 1
//     }
//   }
//   if (params[0].length > 0) {
//     await bulkInsert(params)
//   }
// }
// const bulkInsert = async (params) => {
//   await pool.query(`INSERT INTO hafsql.reputations_table (account, reputation, last_update)
//     SELECT * FROM UNNEST ($1::int4[], $2::text[], $3::numeric[])
//     ON CONFLICT ON CONSTRAINT hafsql_reputations_table_un DO NOTHING;`, params)
// }

const setUserRep = async (userId, rep, lastUpdate) => {
  if (typeof rep === 'bigint') {
    rep = rep.toString(10)
  }
  await pool.query(`INSERT INTO hafsql.reputations_table (account, reputation, last_update) VALUES($1, $2, $3)
    ON CONFLICT ON CONSTRAINT hafsql_reputations_table_un
    DO UPDATE SET reputation=$2;`, [userId, rep, lastUpdate])
}
const getUserRep = async (userId) => {
  const getRep = await pool.query(
    'SELECT r.reputation, r.last_update FROM hafsql.reputations_table r WHERE r.account=$1',
    [userId]
  )
  if (getRep.rowCount < 1) {
    return [0, 0]
  }
  const rep = [getRep.rows[0].reputation, getRep.rows[0].last_update]
  return rep
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
    accountCache[username] = id
    return id
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'reputations']
  )
}

// Clear votes older than 7 days from cache and table
const intervalTime = 60000 // 10m
setInterval(async () => {
  console.log('Last vote: ' + new Date(lastVoteTimestamp))
  if (useCache) {
    await client.query('DELETE FROM vote_cache WHERE timestamp < $1', [lastVoteTimestamp - 604800000])
  } else {
    await pool.query('DELETE FROM hafsql.votescache_table WHERE timestamp < $1', [lastVoteTimestamp - 604800000])
  }
}, intervalTime)

// Need recent votes in the database for shutdown recovery
// TEMP table for duration of the sync till past week
const getVoteCache = async (voterId, postId) => {
  let t
  if (!useCache) {
    t = await pool.query('SELECT shares FROM hafsql.votescache_table WHERE voter=$1 AND post_id=$2', [voterId, postId])
  } else {
    t = await client.query('SELECT shares FROM vote_cache WHERE voter=$1 AND post_id=$2', [voterId, postId])
  }
  if (t.rowCount > 0) {
    return t.rows[0].shares
  } else {
    return null
  }
}
const setVoteCache = async (voterId, postId, shares, timestamp) => {
  if (!useCache) {
    await pool.query(`INSERT INTO hafsql.votescache_table (voter,post_id,shares,timestamp) VALUES ($1,$2,$3,$4)
      ON CONFLICT ON CONSTRAINT hafsql_votescache_table_un DO UPDATE SET shares=$3, timestamp=$4;`, [voterId, postId, shares, timestamp])
  } else {
    await client.query(`INSERT INTO vote_cache (voter,post_id,shares,timestamp) VALUES ($1,$2,$3,$4)
      ON CONFLICT ON CONSTRAINT vote_cache_un DO UPDATE SET shares=$3, timestamp=$4;`, [voterId, postId, shares, timestamp])
  }
}

const getPostId = async (author, permlink) => {
  const getId = await pool.query(
    'SELECT c.id FROM hafsql.comments_table c WHERE c.author=$1 AND c.permlink=$2',
    [author, permlink]
  )
  if (getId.rowCount < 1) {
    return null
  }
  return getId.rows[0].id
}

const setupTempTables = async () => {
  client = await pool.connect()
  // Vote cache
  await client.query(`CREATE TEMP TABLE vote_cache (
    voter int4 NOT NULL,
    post_id int4 NOT NULL,
    shares varchar NOT NULL DEFAULT '0',
    timestamp int8 NOT NULL,
    CONSTRAINT vote_cache_un UNIQUE (voter, post_id)
  );`)
  await client.query('CREATE INDEX IF NOT EXISTS vote_cache_timestamp_idx ON vote_cache USING btree (timestamp);')

  // Reputation cache
  // await client.query(`CREATE TEMP TABLE rep_cache (
  //   account int4 NOT NULL,
  //   reputation varchar NOT NULL DEFAULT '0',
  //   last_update int8 NOT NULL,
  //   CONSTRAINT rep_cache_un UNIQUE (account)
  // );`)
}

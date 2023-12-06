import { pool } from '../database.js'

let accountCache = {}
let repCache = {}
let voteCache = {} // [voter, shares, timestamp]
let useCache = true
let lastVoteTimestamp = 0

export const syncReputations = async () => {
  useCache = false
  accountCache = {}
  repCache = {}
  voteCache = {}
  const intervalTime = 3000
  setInterval(() => {
    fillReputations(1000)
  }, intervalTime)
}

export const fillReputations = async (limit = 200000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['reputations']
  )
  start = Number(start.rows[0].last_op_id)
  let opIdFrom2WeeksAgo
  if (useCache) {
    // get last op id from 2weeks ago if starting sync
    const last2Weeks = await pool.query(`SELECT x.id FROM hive.operations x where timestamp < now() - interval '8days'
      order by timestamp desc
      limit 1`)
    opIdFrom2WeeksAgo = Number(last2Weeks.rows[0].id)
    if (start > 0) {
      // better to not use cache
      // start !==0 is only after one successful sync
      useCache = false
    }
  }
  let votes = await getVotes(start, limit)
  if (useCache) {
    // if syncing don't go to recent votes
    while (votes.rowCount > 0 && start < opIdFrom2WeeksAgo) {
      await processVotes(votes.rows)
      start = Number(votes.rows[votes.rowCount - 1].op_id)
      votes = await getVotes(start, limit)
    }
  } else {
    // we come here only after sync
    while (votes.rowCount > 0) {
      await processVotes(votes.rows)
      start = votes.rows[votes.rowCount - 1].op_id
      await updateLastOpId(start)
      votes = await getVotes(start, limit)
    }
  }
  // if during sync
  if (useCache) {
    await insertReputationsAfterSync()
    await updateLastOpId(start)
  }
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
    const postStr = vote.author + vote.permlink
    const authorId = await getUserId(vote.author)
    const voterId = await getUserId(vote.voter)
    const cacheIndex = voterId + ';' + postStr
    const timestamp = new Date(vote.timestamp).getTime()
    lastVoteTimestamp = timestamp
    const len = vote.rshares.length
    let shares = 0
    if (len > 12) {
      shares = Number(vote.rshares.substring(0, len - 12))
      if (isNaN(shares)) {
        continue
      }
    } else {
      continue
    }
    const userRep = Number(await getUserRep(authorId))

    // Cache votes in the memory for duration of the sync
    if (useCache) {
      if (Object.hasOwn(voteCache, cacheIndex)) {
        const rep = userRep + shares - voteCache[cacheIndex][1]
        await setUserRep(authorId, rep)
        voteCache[cacheIndex] = [voterId, shares, timestamp]
      } else {
        // [voter, shares, timestamp]
        voteCache[cacheIndex] = [voterId, shares, timestamp]
        const rep = userRep + shares
        await setUserRep(authorId, rep)
      }
    } else {
      // After sync use cache table
      // Need recent votes in the database for shutdown recovery
      const postId = await getPostId(vote.author, vote.permlink)
      if (!postId) {
        continue
      }
      const voteCache = await getVoteCache(voterId, postId)
      if (voteCache === null) {
        await setVoteCache(voterId, postId, shares, timestamp)
        const rep = userRep + shares
        await setUserRep(authorId, rep)
      } else {
        const rep = userRep + shares - voteCache
        await setUserRep(authorId, rep)
        await setVoteCache(voterId, postId, shares, timestamp)
      }
    }
  }
}

// we bulk insert the reputations from cache after sync is done
// has to be in batches - postgres param limit = 65k
const insertReputationsAfterSync = async () => {
  let params = [[], []]
  let i = 1
  for (const userId in repCache) {
    params[0].push(userId)
    params[1].push(repCache[userId])
    i++
    if (i >= 20000) {
      await bulkInsert(params)
      params = [[], []]
      i = 1
    }
  }
  if (params[0].length > 0) {
    await bulkInsert(params)
  }
}
const bulkInsert = async (params) => {
  await pool.query(`INSERT INTO hafsql.reputations_table (account, reputation)
    SELECT * FROM UNNEST ($1::int4[], $2::numeric[])
    ON CONFLICT ON CONSTRAINT hafsql_reputations_table_un DO NOTHING;`, params)
}

// Insert into cache during sync otherwise database
const setUserRep = async (userId, rep) => {
  if (useCache) {
    repCache[userId] = rep
  } else {
    await pool.query(`INSERT INTO hafsql.reputations_table (account, reputation) VALUES($1, $2)
      ON CONFLICT ON CONSTRAINT hafsql_reputations_table_un
      DO UPDATE SET reputation=$2;`, [userId, rep])
  }
}

// Cache reputation during sync
const getUserRep = async (userId) => {
  if (useCache && Object.hasOwn(repCache, userId)) {
    return repCache[userId]
  } else {
    const getRep = await pool.query(
      'SELECT r.reputation FROM hafsql.reputations_table r WHERE r.account=$1',
      [userId]
    )
    if (getRep.rowCount < 1) {
      return 0
    }
    const rep = getRep.rows[0].reputation
    repCache[userId] = rep
    return rep
  }
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
    for (const i in voteCache) {
      if (lastVoteTimestamp - voteCache[i][2] > 604800000) {
        delete voteCache[i]
      }
    }
  } else {
    await pool.query('DELETE FROM hafsql.votescache_table WHERE timestamp < $1', [lastVoteTimestamp - 604800000])
  }
}, intervalTime)

const getVoteCache = async (voterId, postId) => {
  const t = await pool.query('SELECT shares FROM hafsql.votescache_table WHERE voter=$1 AND post_id=$2', [voterId, postId])
  if (t.rowCount > 0) {
    return t.rows[0].shares
  } else {
    return null
  }
}

const setVoteCache = async (voterId, postId, shares, timestamp) => {
  await pool.query(`INSERT INTO hafsql.votescache_table (voter,post_id,shares,timestamp) VALUES ($1,$2,$3,$4)
    ON CONFLICT ON CONSTRAINT hafsql_votescache_table_un DO NOTHING;`, [voterId, postId, shares, timestamp])
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

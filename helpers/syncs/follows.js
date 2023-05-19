import { pool } from '../database.js'
import { validateAccountName } from '../validateUsername.js'

let accountCache = {}
let useCache = true

export const syncFollows = async () => {
  useCache = false
  accountCache = {}
  const intervalTime = 3000
  setInterval(() => {
    fillFollows(1000)
  }, intervalTime)
}

// strings
// Sync done in 3.66375 minutes. Live sync started...

// num
// Sync done in 4.599083333333334 minutes. Live sync started...
// string
// Sync done in 4.677783333333333 minutes. Live sync started...
export const fillFollows = async (limit = 20000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['follows']
  )
  start = start.rows[0].last_op_id
  let follows = await getFollows(start, limit)
  let i = 0
  while (follows.length > 0) {
    await insertFollows(follows[i])
    i++
    if (i >= follows.length) {
      i = 0
      const start = follows[follows.length - 1].op_id
      await updateLastOpId(start)
      if (start >= 100000000) {
        break
      }
      follows = await getFollows(start, limit)
    }
  }
}

const getFollows = async (start, limit = 10000) => {
  const result = await pool.query(
    `SELECT op_id, json, required_posting_auths FROM hafsql."TxCustomJson"
      WHERE id=$1 AND op_id > $2 ORDER BY op_id ASC LIMIT $3`,
    ['follow', start, limit]
  )
  if (result.rowCount <= 0) {
    return []
  }
  // Validating custom json
  const followsArray = []
  for (let i = 0; i < result.rowCount; i++) {
    const customJson = result.rows[i]
    try {
      let parsedJson = JSON.parse(customJson.json)
      const postingAuths = customJson.required_posting_auths
      if (!Array.isArray(parsedJson)) {
        if (typeof parsedJson !== 'object' || customJson.op_id > 27630458) {
          continue
        }
        parsedJson = ['follow', parsedJson]
      }
      if (parsedJson.length !== 2) {
        continue
      }
      if (parsedJson[0] !== 'follow' && parsedJson[0] !== 'reblog') {
        continue
      }
      if (typeof parsedJson[1] !== 'object') {
        continue
      }
      const keys = Object.keys(parsedJson[1])
      if (keys.length !== 3) {
        continue
      }
      const type = parsedJson[0]
      if (type === 'follow') {
        if (
          !Object.hasOwn(parsedJson[1], 'follower') ||
          !Object.hasOwn(parsedJson[1], 'following') ||
          !Object.hasOwn(parsedJson[1], 'what')
        ) {
          continue
        }
        const { follower, following, what } = parsedJson[1]
        if (validateAccountName(follower) || validateAccountName(following)) {
          continue
        }
        if (postingAuths[0] !== follower) {
          continue
        }
        if (!Array.isArray(what) || what.length > 1) {
          continue
        }
        const ids = {}
        ids[follower] = await getUserId(follower)
        if (!ids[follower]) {
          continue
        }
        ids[following] = await getUserId(following)
        if (!ids[following]) {
          continue
        }
        followsArray.push({
          type,
          follower: ids[follower],
          following: ids[following],
          what,
          op_id: customJson.op_id
        })
      } else {
        if (
          !Object.hasOwn(parsedJson[1], 'account') ||
          !Object.hasOwn(parsedJson[1], 'author') ||
          !Object.hasOwn(parsedJson[1], 'permlink')
        ) {
          continue
        }
        const { account, author, permlink } = parsedJson[1]
        if (validateAccountName(account) || validateAccountName(author)) {
          continue
        }
        if (postingAuths[0] !== account) {
          continue
        }
        // const getIds = await pool.query('SELECT a.name, a.id FROM hive.accounts a WHERE a.name IN($1, $2)', [account, author])
        // if (getIds.rowCount !== 2) {
        //   continue
        // }
        // const ids = {}
        // for (let i = 0; i < 2; i++) {
        //   ids[getIds.rows[i].name] = getIds.rows[i].id
        // }
        followsArray.push({
          type,
          account,
          author,
          permlink,
          op_id: customJson.op_id
        })
      }
    } catch (e) {
      continue
    }
  }
  return followsArray
}

// Caching ids for duration of the sync
const getUserId = async (username) => {
  if (useCache && Object.hasOwn(accountCache, username)) {
    return accountCache[username]
  } else {
    const getId = await pool.query('SELECT a.id FROM hive.accounts a WHERE a.name=$1', [username])
    if (getId.rowCount < 1) {
      return null
    }
    const id = getId.rows[0].id
    accountCache[username] = id
    return id
  }
}

// defs = {
//   '': Action.Nothing,
//   'blog': Action.Blog,
//   'follow': Action.Blog,
//   'ignore': Action.Ignore,
//   'blacklist': Action.Blacklist,
//   'follow_blacklist': Action.Follow_blacklist,
//   'unblacklist': Action.Unblacklist,
//   'unfollow_blacklist': Action.Unfollow_blacklist,
//   'follow_muted': Action.Follow_muted,
//   'unfollow_muted': Action.Unfollow_muted,
//   'reset_blacklist': Action.Reset_blacklist,
//   'reset_following_list': Action.Reset_following_list,
//   'reset_muted_list': Action.Reset_muted_list,
//   'reset_follow_blacklist': Action.Reset_follow_blacklist,
//   'reset_follow_muted_list': Action.Reset_follow_muted_list,
//   'reset_all_lists': Action.Reset_all_lists,
// }

const insertFollows = async (follow) => {
  if (follow.type === 'reblog') {
    return insertReblog(follow)
  }
  if (follow.what.length === 0) {
    return unfollowUnmute(follow)
  }
  const what = follow.what[0]
  switch (what) {
    case 'blacklist':
      return blacklist(follow)
    case 'unblacklist':
      return unblacklist(follow)
    case 'follow_blacklist':
      return followBlacklist(follow)
    case 'unfollow_blacklist':
      return unfollowBlacklist(follow)
    case 'follow_muted':
      return followMuted(follow)
    case 'unfollow_muted':
      return unfollowMuted(follow)
    case 'follow':
    case 'blog':
      return actualFollow(follow)
    case 'ignore':
      return mute(follow)
    case 'reset_blacklist':
      return resetBlacklist(follow)
    case 'reset_following_list':
      return resetFollowingList(follow)
    case 'reset_muted_list':
      return resetMutedList(follow)
    case 'reset_follow_blacklist':
      return resetFollowBlacklist(follow)
    case 'reset_follow_muted_list':
      return resetFollowMutedList(follow)
    case 'reset_all_lists':
      return resetAllLists(follow)
    default:
      break
  }
}

const blacklist = async (follow) => {
  await pool.query(
    `INSERT INTO hafsql.blacklists_table (blacklister, blacklisted)
      VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_blacklists_table_un
      DO NOTHING;`,
    [follow.follower, follow.following]
  )
}
const unblacklist = async (follow) => {
  await pool.query(
    `DELETE FROM hafsql.blacklists_table
      WHERE blacklister=$1 AND blacklisted=$2;`,
    [follow.follower, follow.following]
  )
}
const followBlacklist = async (follow) => {
  await pool.query(
    `INSERT INTO hafsql.blacklist_follows_table (account, blacklist)
      VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_blacklist_follows_table_un
      DO NOTHING;`,
    [follow.follower, follow.following]
  )
}
const unfollowBlacklist = async (follow) => {
  await pool.query(
    `DELETE FROM hafsql.blacklist_follows_table
      WHERE account=$1 AND blacklist=$2;`,
    [follow.follower, follow.following]
  )
}
const followMuted = async (follow) => {
  await pool.query(
    `INSERT INTO hafsql.mute_follows_table (account, mute_list)
      VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_mute_follows_table_un
      DO NOTHING;`,
    [follow.follower, follow.following]
  )
}
const unfollowMuted = async (follow) => {
  await pool.query(
    `DELETE FROM hafsql.mute_follows_table
      WHERE account=$1 AND mute_list=$2;`,
    [follow.follower, follow.following]
  )
}
const actualFollow = async (follow) => {
  await pool.query(
    `INSERT INTO hafsql.follows_table (follower, following)
      VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_follows_table_un
      DO NOTHING;`,
    [follow.follower, follow.following]
  )
}
const mute = async (follow) => {
  await pool.query(
    `INSERT INTO hafsql.mutes_table (muter, muted)
      VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_mutes_table_un
      DO NOTHING;`,
    [follow.follower, follow.following]
  )
}
// TODO: After Posts/Comments table - need to verify posts
const insertReblog = async (follow) => {}

const unfollowUnmute = async (follow) => {
  await pool.query(
    `DELETE FROM hafsql.follows_table
      WHERE follower=$1 AND following=$2;`,
    [follow.follower, follow.following]
  )
  await pool.query(
    `DELETE FROM hafsql.mutes_table
      WHERE muter=$1 AND muted=$2;`,
    [follow.follower, follow.following]
  )
}

const resetBlacklist = async (follow) => {
  await pool.query(`DELETE FROM hafsql.blacklists_table
    WHERE blacklister=$1;`,
  [follow.follower])
}

const resetFollowingList = async (follow) => {
  await pool.query(`DELETE FROM hafsql.follows_table
    WHERE follower=$1;`,
  [follow.follower])
}

const resetMutedList = async (follow) => {
  await pool.query(`DELETE FROM hafsql.mutes_table
    WHERE muter=$1;`,
  [follow.follower])
}

const resetFollowBlacklist = async (follow) => {
  await pool.query(`DELETE FROM hafsql.blacklist_follows_table
    WHERE account=$1;`,
  [follow.follower])
}

const resetFollowMutedList = async (follow) => {
  await pool.query(`DELETE FROM hafsql.mute_follows_table
    WHERE account=$1;`,
  [follow.follower])
}

const resetAllLists = async (follow) => {
  await resetBlacklist(follow)
  await resetFollowingList(follow)
  await resetMutedList(follow)
  await resetFollowBlacklist(follow)
  await resetFollowMutedList(follow)
}

// const clearUsername = (username) => {
//   // const temp = username.replaceAll('\t', '')
//   // return temp.replaceAll('\r', '')
//   return username.slice(0, 16)
// }

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'follows']
  )
}

import { pool } from '../database.js'
import { validateAccountName } from '../validateUsername.js'

let accountCache = {}
let useCache = true

let followersArray = []

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
  while (follows.length > 0) {
    await insertFollows(follows)
    const start = follows[follows.length - 1].op_id
    await updateLastOpId(start)
    if (start >= 100000000) {
      break
    }
    follows = await getFollows(start, limit)
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
        const { follower, what } = parsedJson[1]
        let { following } = parsedJson[1]
        if (!Array.isArray(following)) {
          following = [following]
        }
        if (validateAccountName(follower)) {
          continue
        }
        if (postingAuths[0] !== follower) {
          continue
        }
        if (!Array.isArray(what) || what.length > 1) {
          continue
        }
        const ids = await processFollowing(follower, following, what)
        followsArray.push({
          type,
          follower: ids.follower,
          following: ids.following,
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

const processFollowing = async (follower, following, what) => {
  const followingsArray = []
  const ids = {}
  ids.follower = await getUserId(follower)
  for (let i = 0; i < following.length; i++) {
    if (validateAccountName(following[i])) {
      continue
    }
    if (follower === following[i]) {
      continue
    }
    const followingId = await getUserId(following[i])
    if (!followingId) {
      continue
    }
    followingsArray.push(followingId)
  }
  ids.following = followingsArray
  return ids
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

const followersHelper = (item, action) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    if (action === 'follow') {
      followersArray.push({ follower, following: following[i] })
    } else {
      for (let k = 0; k < followersArray.length; k++) {
        const temp = followersArray[k]
        if (typeof temp === 'undefined') {
          continue
        }
        if (temp.follower === follower && temp.following === following[i]) {
          delete followersArray[k]
        }
      }
    }
  }
}

const insertFollows = async (follow) => {
  followersArray = []
  for (let i = 0; i < follow.length; i++) {
    const item = follow[i]
    if (item.type === 'reblog') {
      await insertReblog(item)
      continue
    }
    if (item.what.length === 0) {
      followersHelper(item, 'unfollow')
      await unfollowUnmute(follow)
      continue
    }
    const what = item.what[0]
    switch (what) {
      case 'blacklist':
        await blacklist(item)
        break
      case 'unblacklist':
        await unblacklist(item)
        break
      case 'follow_blacklist':
        await followBlacklist(item)
        break
      case 'unfollow_blacklist':
        await unfollowBlacklist(item)
        break
      case 'follow_muted':
        await followMuted(item)
        break
      case 'unfollow_muted':
        await unfollowMuted(item)
        break
      case 'follow':
      case 'blog':
        followersHelper(item, 'follow')
        break
      case 'ignore':
        await mute(item)
        break
      case 'reset_blacklist':
        await resetBlacklist(item)
        break
      case 'reset_following_list':
        await resetFollowingList(item)
        break
      case 'reset_muted_list':
        await resetMutedList(item)
        break
      case 'reset_follow_blacklist':
        await resetFollowBlacklist(item)
        break
      case 'reset_follow_muted_list':
        await resetFollowMutedList(item)
        break
      case 'reset_all_lists':
        await resetAllLists(item)
        break
      default:
        break
    }
  }
  await actualFollow()
}

const blacklist = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `INSERT INTO hafsql.blacklists_table (blacklister, blacklisted)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_blacklists_table_un
        DO NOTHING;`,
      [follower, following[i]]
    )
  }
}
const unblacklist = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `DELETE FROM hafsql.blacklists_table
        WHERE blacklister=$1 AND blacklisted=$2;`,
      [follower, following[i]]
    )
  }
}
const followBlacklist = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `INSERT INTO hafsql.blacklist_follows_table (account, blacklist)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_blacklist_follows_table_un
        DO NOTHING;`,
      [follower, following[i]]
    )
  }
}
const unfollowBlacklist = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `DELETE FROM hafsql.blacklist_follows_table
        WHERE account=$1 AND blacklist=$2;`,
      [follower, following[i]]
    )
  }
}
const followMuted = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `INSERT INTO hafsql.mute_follows_table (account, mute_list)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_mute_follows_table_un
        DO NOTHING;`,
      [follower, following[i]]
    )
  }
}
const unfollowMuted = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `DELETE FROM hafsql.mute_follows_table
        WHERE account=$1 AND mute_list=$2;`,
      [follower, following[i]]
    )
  }
}
const actualFollow = async () => {
  let queryString = ''
  let first = true
  for (let i = 0; i < followersArray.length; i++) {
    const temp = followersArray[i]
    if (typeof temp === 'undefined') {
      continue
    }
    if (!first) {
      queryString += ','
    }
    queryString += `(${temp.follower}, ${temp.following})`
    if (first) {
      first = false
    }
  }
  await pool.query(
    `INSERT INTO hafsql.follows_table (follower, following)
      VALUES ${queryString} ON CONFLICT ON CONSTRAINT hafsql_follows_table_un
      DO NOTHING;`
  )
}
const mute = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `INSERT INTO hafsql.mutes_table (muter, muted)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_mutes_table_un
        DO NOTHING;`,
      [follower, following[i]]
    )
  }
}
// TODO: After Posts/Comments table - need to verify posts
const insertReblog = async (follow) => {}

const unfollowUnmute = async (item) => {
  const { follower, following } = item
  for (let i = 0; i < following; i++) {
    await pool.query(
      `DELETE FROM hafsql.follows_table
        WHERE follower=$1 AND following=$2;`,
      [follower, following[i]]
    )
    await pool.query(
      `DELETE FROM hafsql.mutes_table
        WHERE muter=$1 AND muted=$2;`,
      [follower, following[i]]
    )
  }
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

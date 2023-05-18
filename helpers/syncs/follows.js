import { pool } from '../database.js'
import { validateAccountName } from '../validateUsername.js'

export const syncFollows = async () => {
  const intervalTime = 3000
  setInterval(() => {
    fillFollows(1000)
  }, intervalTime)
}

export const fillFollows = async (limit = 10) => {
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
      console.log('first')
      // console.log(parsedJson)
      if (!Array.isArray(parsedJson)) {
        if (typeof parsedJson !== 'object' || customJson.op_id > 27630458) {
          continue
        }
        parsedJson = ['follow', parsedJson]
      }
      console.log('second')

      if (parsedJson.length !== 2) {
        continue
      }
      console.log('third')

      if (parsedJson[0] !== 'follow' && parsedJson[0] !== 'reblog') {
        continue
      }
      console.log('4')

      if (typeof parsedJson[1] !== 'object') {
        continue
      }
      console.log('5')

      const keys = Object.keys(parsedJson[1])
      if (keys.length !== 3) {
        continue
      }
      console.log('6')

      const type = parsedJson[0]
      if (type === 'follow') {
        if (!parsedJson[1].hasOwn('follower') || !parsedJson[1].hasOwn('following') || !parsedJson[1].hasOwn('what')) {
          continue
        }
        console.log('7')

        const { follower, following, what } = parsedJson[1]
        if (validateAccountName(follower) || validateAccountName(following)) {
          continue
        }
        console.log('8')

        if (postingAuths[0] !== follower) {
          continue
        }
        console.log('9')

        if (!Array.isArray(what) || what.length > 1) {
          continue
        }
        console.log('10')

        followsArray.push({
          type,
          follower,
          following,
          what,
          op_id: customJson.op_id
        })
      } else {
        if (!parsedJson[1].hasOwn('account') || !parsedJson[1].hasOwn('author') || !parsedJson[1].hasOwn('permlink')) {
          continue
        }
        const { account, author, permlink } = parsedJson[1]
        if (validateAccountName(account) || validateAccountName(author)) {
          continue
        }
        if (postingAuths[0] !== account) {
          continue
        }
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
    case 'blog':
      return actualFollow(follow)
    case 'ignore':
      return mute(follow)
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

import { Transaction } from '../deps.ts'
import { pool } from '../helpers/database.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { CustomJsonFollow, Follows } from '../helpers/types.ts'
import {
  clearUsername,
  validateAccountName,
} from '../helpers/functions/validate_username.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getUserId } from '../helpers/functions/get_user_id.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Follows] Start massive sync... ⏳')
      syncFollows()
    }
  }
}

let firstRun = true
const syncFollows = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    // TODO: increase the limit
    await fillFollows()
    print('[Follows] Massive sync done ✅')
    print('[Follows] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillFollows()
  await sleep(intervalTime)
  syncFollows()
}

const fillFollows = async () => {
  let blockRange = await getBlockRange('follows')
  while (blockRange) {
    const follows = await getFollows(blockRange)
    await insertFollows(follows, blockRange)
    blockRange = await getBlockRange('follows')
  }
}

const getFollows = async (blockRange: number[]) => {
  const client = await pool.connect()
  // block 5999998 - op_id 25769795186065408
  const result = await client.queryObject<CustomJsonFollow>(
    `SELECT op_id, json, required_posting_auths FROM hafsql.op_custom_json
      WHERE id=$1 AND op_id >= hafsql.first_op_id_from_block_num($2)
      AND op_id <= hafsql.last_op_id_from_block_num($3)
      AND CASE WHEN op_id > 25769795186065408 THEN hafsql.to_json("json")->>0 = 'follow' ELSE TRUE END
      ORDER BY op_id ASC LIMIT $3`,
    ['follow', blockRange[0], blockRange[1]],
  )
  client.release()
  if (result.rows.length <= 0) {
    return []
  }
  // Validating custom json
  const followsArray = []
  for (let i = 0; i < result.rows.length; i++) {
    const customJson = result.rows[i]
    try {
      const isValid = await validateCustomJson(customJson)
      if (!isValid) {
        continue
      }
      followsArray.push({
        follower: isValid.ids.follower,
        following: isValid.ids.following,
        what: isValid.what,
        op_id: customJson.op_id,
      })
    } catch (_e) {
      // bad json
      continue
    }
  }
  return followsArray
}

const validateCustomJson = async (customJson: CustomJsonFollow) => {
  let parsedJson: [
    string,
    { follower: string; following: string[]; what: string[] },
  ] = JSON.parse(customJson.json)
  const postingAuths = customJson.required_posting_auths
  if (!Array.isArray(parsedJson)) {
    if (
      typeof parsedJson !== 'object' ||
      customJson.op_id > BigInt('25769795186065408')
    ) {
      return
    }
    parsedJson = ['follow', parsedJson]
  }
  if (parsedJson.length !== 2) {
    return
  }
  if (parsedJson[0] !== 'follow') {
    return
  }
  if (typeof parsedJson[1] !== 'object') {
    return
  }
  const keys = Object.keys(parsedJson[1])
  if (keys.length !== 3) {
    return
  }
  if (
    !Object.hasOwn(parsedJson[1], 'follower') ||
    !Object.hasOwn(parsedJson[1], 'following') ||
    !Object.hasOwn(parsedJson[1], 'what')
  ) {
    return
  }
  const { follower, what } = parsedJson[1]
  let { following } = parsedJson[1]
  if (!Array.isArray(following)) {
    following = [following]
  }
  if (validateAccountName(clearUsername(follower))) {
    return
  }
  if (postingAuths[0] !== clearUsername(follower)) {
    return
  }
  if (!Array.isArray(what) || what.length > 1) {
    return
  }
  const ids = await getIds(follower, following, what)

  if (!ids) {
    return
  }
  return { ids, what }
}

const getIds = async (
  follower: string,
  following: string[],
  what: string[],
) => {
  const followingsArray = []
  const ids = {
    follower: 0,
    following: [0],
  }
  const followerId = await getUserId(follower)
  if (!followerId) {
    return
  }
  ids.follower = followerId
  for (let i = 0; i < following.length; i++) {
    if (validateAccountName(clearUsername(following[i]))) {
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
  if (followingsArray.length < 1 && !what[0].includes('reset_')) {
    return
  }
  ids.following = followingsArray
  return ids
}

const insertFollows = async (follows: Follows[], blockRange: number[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_follows_sync')
  await trx.begin()
  for (let i = 0; i < follows.length; i++) {
    const item = follows[i]
    if (item.what.length === 0) {
      await unfollowUnmute(item, trx)
      continue
    }
    const what = item.what[0]
    switch (what) {
      case 'blacklist':
        await blacklist(item, trx)
        break
      case 'unblacklist':
        await unblacklist(item, trx)
        break
      case 'follow_blacklist':
        await followBlacklist(item, trx)
        break
      case 'unfollow_blacklist':
        await unfollowBlacklist(item, trx)
        break
      case 'follow_muted':
        await followMuted(item, trx)
        break
      case 'unfollow_muted':
        await unfollowMuted(item, trx)
        break
      case 'follow':
      case 'blog':
        follow(item, trx)
        break
      case 'ignore':
        mute(item, trx)
        break
      case 'reset_blacklist':
        await resetBlacklist(item, trx)
        break
      case 'reset_following_list':
        await resetFollowingList(item, trx)
        break
      case 'reset_muted_list':
        await resetMutedList(item, trx)
        break
      case 'reset_follow_blacklist':
        await resetFollowBlacklist(item, trx)
        break
      case 'reset_follow_muted_list':
        await resetFollowMutedList(item, trx)
        break
      case 'reset_all_lists':
        await resetAllLists(item, trx)
        break
      default:
        break
    }
  }
  await updateLastBlockNum('follows', blockRange[1], trx)
  await trx.commit()
}

const blacklist = async (item: Follows, trx: Transaction) => {
  try {
    const { follower, following } = item
    for (let i = 0; i < following.length; i++) {
      await trx.queryObject(
        `INSERT INTO hafsql.blacklists_table (blacklister, blacklisted)
          VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_blacklists_table_un
          DO NOTHING;`,
        [follower, following[i]],
      )
    }
  } catch (e) {
    throw new Error(e)
  }
}
const unblacklist = async (item: Follows, trx: Transaction) => {
  try {
    const { follower, following } = item
    for (let i = 0; i < following.length; i++) {
      await trx.queryObject(
        `DELETE FROM hafsql.blacklists_table
          WHERE blacklister=$1 AND blacklisted=$2;`,
        [follower, following[i]],
      )
    }
  } catch (e) {
    throw new Error(e)
  }
}
const followBlacklist = async (item: Follows, trx: Transaction) => {
  try {
    const { follower, following } = item
    for (let i = 0; i < following.length; i++) {
      await trx.queryObject(
        `INSERT INTO hafsql.blacklist_follows_table (account, blacklist)
          VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_blacklist_follows_table_un
          DO NOTHING;`,
        [follower, following[i]],
      )
    }
  } catch (e) {
    throw new Error(e)
  }
}
const unfollowBlacklist = async (item: Follows, trx: Transaction) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    await trx.queryObject(
      `DELETE FROM hafsql.blacklist_follows_table
        WHERE account=$1 AND blacklist=$2;`,
      [follower, following[i]],
    )
  }
}
const followMuted = async (item: Follows, trx: Transaction) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    await trx.queryObject(
      `INSERT INTO hafsql.mute_follows_table (account, mute_list)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_mute_follows_table_un
        DO NOTHING;`,
      [follower, following[i]],
    )
  }
}
const unfollowMuted = async (item: Follows, trx: Transaction) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    await trx.queryObject(
      `DELETE FROM hafsql.mute_follows_table
        WHERE account=$1 AND mute_list=$2;`,
      [follower, following[i]],
    )
  }
}

const follow = async (item: Follows, trx: Transaction) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    await trx.queryObject(
      `INSERT INTO hafsql.follows_table (follower, following)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_follows_table_un
        DO NOTHING;`,
      [follower, following[i]],
    )
  }
}

const mute = async (item: Follows, trx: Transaction) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    await trx.queryObject(
      `INSERT INTO hafsql.mutes_table (muter, muted)
        VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_mutes_table_un
        DO NOTHING;`,
      [follower, following[i]],
    )
  }
}

const unfollowUnmute = async (item: Follows, trx: Transaction) => {
  const { follower, following } = item
  for (let i = 0; i < following.length; i++) {
    await trx.queryObject(
      `DELETE FROM hafsql.follows_table
        WHERE follower=$1 AND following=$2;`,
      [follower, following[i]],
    )
    await trx.queryObject(
      `DELETE FROM hafsql.mutes_table
        WHERE muter=$1 AND muted=$2;`,
      [follower, following[i]],
    )
  }
}

const resetBlacklist = async (item: Follows, trx: Transaction) => {
  await trx.queryObject(
    `DELETE FROM hafsql.blacklists_table
    WHERE blacklister=$1;`,
    [item.follower],
  )
}

const resetFollowingList = async (item: Follows, trx: Transaction) => {
  await trx.queryObject(
    `DELETE FROM hafsql.follows_table
    WHERE follower=$1;`,
    [item.follower],
  )
}

const resetMutedList = async (item: Follows, trx: Transaction) => {
  await trx.queryObject(
    `DELETE FROM hafsql.mutes_table
    WHERE muter=$1;`,
    [item.follower],
  )
}

const resetFollowBlacklist = async (item: Follows, trx: Transaction) => {
  await trx.queryObject(
    `DELETE FROM hafsql.blacklist_follows_table
    WHERE account=$1;`,
    [item.follower],
  )
}

const resetFollowMutedList = async (item: Follows, trx: Transaction) => {
  await trx.queryObject(
    `DELETE FROM hafsql.mute_follows_table
    WHERE account=$1;`,
    [item.follower],
  )
}

const resetAllLists = async (item: Follows, trx: Transaction) => {
  await resetBlacklist(item, trx)
  await resetFollowingList(item, trx)
  await resetMutedList(item, trx)
  await resetFollowBlacklist(item, trx)
  await resetFollowMutedList(item, trx)
}

import { PoolClient, Transaction } from '../deps.ts'
import { pool } from '../helpers/database.ts'
import {
  Communities,
  CommunityJson,
  CommunityRoles,
  CustomJsonFollow,
  LastOpId,
} from '../helpers/types.ts'
import {
  clearUsername,
  validateAccountName,
} from '../helpers/validate_username.ts'
import { print } from '../helpers/print.ts'
import { sleep } from '../helpers/sleep.ts'
import { createCommunitiesIndexes } from '../indexes/hafsql.ts'
import { cleanString } from '../helpers/clean_string.ts'

const roles = {
  muted: -2,
  guest: 0,
  member: 2,
  mod: 4,
  admin: 6,
  owner: 8,
}

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Community roles] Start massive sync... 🚀')
      syncCommunities()
    }
  }
}

let firstRun = true
const syncCommunities = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillCommunities(50000)
    print('[Community roles] Massive sync done ✅')
    print('[Community roles] Creating indexes... 🚀')
    await createCommunitiesIndexes()
    print('[Community roles] Indexes have been created ✅')
    print('[Community roles] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillCommunities(20000)
  await sleep(intervalTime)
  syncCommunities()
}

const fillCommunities = async (limit: number) => {
  const client = await pool.connect()
  const startQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['communities'],
  )
  let start = startQ.rows[0].last_op_id
  client.release()
  let communities = await getCommunities(start, limit)
  while (communities.length > 0) {
    await insertCommunities(communities)
    start = communities[communities.length - 1].op_id
    await updateLastOpId(start)
    communities = await getCommunities(start, limit)
  }
}

const getCommunities = async (start: bigint, limit: number) => {
  const client = await pool.connect()
  const result = await client.queryObject<CustomJsonFollow>(
    `SELECT op_id, json, required_posting_auths FROM hafsql.op_custom_json
      WHERE id=$1 AND op_id > $2 ORDER BY op_id ASC LIMIT $3`,
    ['community', start, limit],
  )
  client.release()
  if (result.rows.length <= 0) {
    return []
  }
  const communitiesArray = []
  for (let i = 0; i < result.rows.length; i++) {
    const customJson = result.rows[i]
    try {
      const parsedJson = JSON.parse(customJson.json)
      const postingAuths = customJson.required_posting_auths
      if (postingAuths.length < 1) {
        continue
      }
      if (!Array.isArray(parsedJson)) {
        continue
      }
      if (parsedJson.length !== 2) {
        continue
      }
      if (typeof parsedJson[0] !== 'string') {
        continue
      }
      if (typeof parsedJson[1] !== 'object') {
        continue
      }
      if (!Object.hasOwn(parsedJson[1], 'community')) {
        continue
      }
      const { community } = parsedJson[1]
      if (validateAccountName(clearUsername(community))) {
        continue
      }
      if (!community.match(/^hive-[1-3]\d{4,6}$/)) {
        continue
      }
      const accountId = await getUserId(community)
      if (!accountId) {
        continue
      }
      communitiesArray.push({
        type: parsedJson[0],
        json: parsedJson[1],
        postingAuths,
        op_id: customJson.op_id,
      })
    } catch (_e) {
      continue
    }
  }
  return communitiesArray
}

const insertCommunities = async (communities: Communities[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_commuinities_sync')
  await trx.begin()
  for (let i = 0; i < communities.length; i++) {
    const { json, postingAuths, type } = communities[i]
    switch (type) {
      case 'subscribe':
        await subscribe(postingAuths, json, trx)
        break
      case 'unsubscribe':
        await unsubscribe(postingAuths, json, trx)
        break
      case 'setRole':
        await setRole(postingAuths, json, trx)
        break
      case 'setUserTitle':
        await setUserTitle(postingAuths, json, trx)
        break
      default:
        break
    }
  }
  await trx.commit()
}

const subscribe = async (
  postingAuths: string[],
  json: CommunityJson,
  trx: Transaction,
) => {
  if (Object.keys(json).length !== 1) {
    return
  }
  const account = await getUserId(postingAuths[0], trx)
  const community = await getUserId(json.community, trx)
  if (!community || !account) {
    return
  }
  await trx.queryObject(
    `INSERT INTO hafsql.community_subs_table (account, community)
      VALUES($1, $2) ON CONFLICT ON CONSTRAINT hafsql_community_subs_table_un
      DO NOTHING;`,
    [account, community],
  )
}

const unsubscribe = async (
  postingAuths: string[],
  json: CommunityJson,
  trx: Transaction,
) => {
  if (Object.keys(json).length !== 1) {
    return
  }
  const account = await getUserId(postingAuths[0], trx)
  const community = await getUserId(json.community, trx)
  if (!community || !account) {
    return
  }
  await trx.queryObject(
    'DELETE FROM hafsql.community_subs_table WHERE account=$1 AND community=$2',
    [account, community],
  )
}

const setRole = async (
  postingAuths: string[],
  json: CommunityJson,
  trx: Transaction,
) => {
  if (Object.keys(json).length !== 3) {
    return
  }
  if (!Object.hasOwn(json, 'account') || !Object.hasOwn(json, 'role')) {
    return
  }
  const actor = await getUserId(postingAuths[0], trx)
  const community = await getUserId(json.community, trx)
  const account = <string> json.account
  const target = await getUserId(account, trx)
  if (!target || !community || !actor) {
    return
  }
  const role = <CommunityRoles> json.role
  if (Object.keys(roles).indexOf(role) < 0) {
    return
  }
  let actorRole = await getRole(actor, community, trx)
  if (actor === community) {
    actorRole = roles.owner
  }
  // only mods and up can alter roles
  if (actorRole < roles.mod) {
    return
  }
  // cannot promote to or above own rank
  if (actorRole <= roles[role]) {
    return
  }
  const targetRole = await getRole(target, community, trx)
  // don't change the owner role
  if (targetRole === roles.owner) {
    return
  }
  if (actor !== target) {
    // cant modify higher-role user
    if (targetRole >= actorRole) {
      return
    }
    // role would not change
    if (targetRole === roles[role]) {
      return
    }
  }
  await trx.queryObject(
    `INSERT INTO hafsql.community_roles_table (account, community, role)
      VALUES($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_community_roles_table_un
      DO UPDATE SET role=$3;`,
    [target, community, roles[role]],
  )
}

const setUserTitle = async (
  postingAuths: string[],
  json: CommunityJson,
  trx: Transaction,
) => {
  if (Object.keys(json).length !== 3) {
    return
  }
  if (!Object.hasOwn(json, 'account') || !Object.hasOwn(json, 'title')) {
    return
  }
  const actor = <number> await getUserId(postingAuths[0], trx)
  const community = await getUserId(json.community, trx)
  const account = <string> json.account
  const target = await getUserId(account, trx)
  if (!target || !community || !actor) {
    return
  }
  if (typeof json.title !== 'string') {
    return
  }
  const title = cleanString(json.title)
  let actorRole = await getRole(actor, community, trx)
  if (actor === community) {
    actorRole = roles.owner
  }
  // only mods can set user titles
  if (actorRole < roles.mod) {
    return
  }
  await trx.queryObject(
    `INSERT INTO hafsql.community_roles_table (account, community, title)
      VALUES($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_community_roles_table_un
      DO UPDATE SET title=$3;`,
    [target, community, title],
  )
}

const getRole = async (
  account: number,
  community: number,
  trx: Transaction | PoolClient,
) => {
  const res = await trx.queryObject<{ role: number }>(
    'SELECT role FROM hafsql.community_roles_table WHERE account=$1 AND community=$2',
    [account, community],
  )
  if (res.rows.length < 1) {
    return 0
  }
  return res.rows[0].role
}

let accountCache: Record<string, number> = {}
setInterval(() => {
  // clear cache every 10min
  accountCache = {}
}, 600000)

// Caching ids
const getUserId = async (username: string, trx?: Transaction | PoolClient) => {
  if (Object.hasOwn(accountCache, username)) {
    return accountCache[username]
  } else {
    if (!trx) {
      trx = await pool.connect()
    }
    const getId = await trx.queryObject<{ id: number }>(
      'SELECT a.id FROM hive.accounts a WHERE a.name=$1',
      [username],
    )
    if (trx instanceof PoolClient) {
      trx.release()
    }
    if (getId.rows.length < 1) {
      return null
    }
    const id = getId.rows[0].id
    accountCache[username] = id
    return id
  }
}

const updateLastOpId = async (opId: bigint) => {
  using client = await pool.connect()
  return client.queryObject(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'communities'],
  )
}

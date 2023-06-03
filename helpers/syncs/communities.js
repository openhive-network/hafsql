import { pool } from '../database.js'
import { clearUsername, validateAccountName } from '../validateUsername.js'

let accountCache = {}
let useCache = true

const roles = {
  muted: -2,
  guest: 0,
  member: 2,
  mod: 4,
  admin: 6,
  owner: 8
}

export const syncCommunities = async () => {
  useCache = false
  accountCache = {}
  const intervalTime = 3000
  setInterval(() => {
    fillCommunities(1000)
  }, intervalTime)
}

export const fillCommunities = async (limit = 20000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['communities']
  )
  start = start.rows[0].last_op_id
  let communities = await getCommunities(start, limit)
  while (communities.length > 0) {
    await insertCommunities(communities)
    start = communities[communities.length - 1].op_id
    await updateLastOpId(start)
    communities = await getCommunities(start, limit)
  }
}

const getCommunities = async (start, limit = 10000) => {
  const result = await pool.query(
    `SELECT op_id, json, required_posting_auths FROM hafsql."TxCustomJson"
      WHERE id=$1 AND op_id > $2 ORDER BY op_id ASC LIMIT $3`,
    ['community', start, limit]
  )
  if (result.rowCount <= 0) {
    return []
  }
  const communitiesArray = []
  for (let i = 0; i < result.rowCount; i++) {
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
      if (!community.match(/^hive-[1]\d{4,6}$/)) {
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
        op_id: customJson.op_id
      })
    } catch (e) {
      continue
    }
  }
  return communitiesArray
}

const insertCommunities = async (communities) => {
  for (let i = 0; i < communities.length; i++) {
    const { json, postingAuths, type } = communities[i]
    switch (type) {
      case 'subscribe':
        await subscribe(postingAuths, json)
        break
      case 'unsubscribe':
        await unsubscribe(postingAuths, json)
        break
      case 'setRole':
        await setRole(postingAuths, json)
        break
      case 'setUserTitle':
        await setUserTitle(postingAuths, json)
        break
      default:
        break
    }
  }
}

const subscribe = async (postingAuths, json) => {
  if (Object.keys(json).length !== 1) {
    return
  }
  const account = await getUserId(postingAuths[0])
  const community = await getUserId(json.community)
  await pool.query(
    `INSERT INTO hafsql.community_subs_table (account, community)
      VALUES($1, $2) ON CONFLICT ON CONSTRAINT hafsql_community_subs_table_un
      DO NOTHING;`,
    [account, community]
  )
}

const unsubscribe = async (postingAuths, json) => {
  if (Object.keys(json).length !== 1) {
    return
  }
  const account = await getUserId(postingAuths[0])
  const community = await getUserId(json.community)
  await pool.query(
    'DELETE FROM hafsql.community_subs_table WHERE account=$1 AND community=$2',
    [account, community]
  )
}

const setRole = async (postingAuths, json) => {
  if (Object.keys(json).length !== 3) {
    return
  }
  if (!Object.hasOwn(json, 'account') || !Object.hasOwn(json, 'role')) {
    return
  }
  const account = await getUserId(postingAuths[0])
  const community = await getUserId(json.community)
  const target = await getUserId(json.account)
  if (!target) {
    return
  }
  const role = json.role
  if (Object.keys(roles).indexOf(role) < 0) {
    return
  }
  let actorRole = await getRole(account, community)
  if (account === community) {
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
  const targetRole = await getRole(target, community)
  // don't change the owner role
  if (targetRole === roles.owner) {
    return
  }
  if (account !== target) {
    // cant modify higher-role user
    if (targetRole >= actorRole) {
      return
    }
    // role would not change
    if (targetRole === roles[role]) {
      return
    }
  }
  await pool.query(
    `INSERT INTO hafsql.community_roles_table (account, community, role)
      VALUES($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_community_roles_table_un
      DO UPDATE SET role=$3;`,
    [account, community, roles[role]]
  )
}

const setUserTitle = async (postingAuths, json) => {
  if (Object.keys(json).length !== 3) {
    return
  }
  if (!Object.hasOwn(json, 'account') || !Object.hasOwn(json, 'title')) {
    return
  }
  const account = await getUserId(postingAuths[0])
  const community = await getUserId(json.community)
  const target = await getUserId(json.account)
  if (!target) {
    return
  }
  if (typeof json.title !== 'string') {
    return
  }
  const title = cleanString(json.title)
  let actorRole = await getRole(account, community)
  if (account === community) {
    actorRole = roles.owner
  }
  // only mods can set user titles
  if (actorRole < roles.mod) {
    return
  }
  await pool.query(
    `INSERT INTO hafsql.community_roles_table (account, community, title)
      VALUES($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_community_roles_table_un
      DO UPDATE SET title=$3;`,
    [account, community, title]
  )
}

// Charcode 0 is invalid for Postgres
const cleanString = (input) => {
  let output = ''
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) !== 0) {
      output += input.charAt(i)
    }
  }
  return output
}

const getRole = async (account, community) => {
  const res = await pool.query(
    'SELECT role FROM hafsql.community_roles_table WHERE account=$1 AND community=$2',
    [account, community]
  )
  if (res.rowCount < 1) {
    return 0
  }
  return res.rows[0].role
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
    [opId, 'communities']
  )
}

// id community
// json ["unsubscribe",{"community":"hive-166847"}]

// id community
// json ["subscribe",{"community":"hive-166847"}]

// ["setRole",{"community":"hive-19812","account":"test-safari","role":"admin","notes":"test admin"}]
// ["setUserTitle",{"community":"hive-180934","account":"french-tech","title":"Tech FR"}]

// ["pinPost",{"community":"hive-168869","account":"galenkp","permlink":"weekend-engagement-week-156-three-year-anniversary-week"}]
// ["unpinPost",{"community":"hive-161155","account":"zapfic.club","permlink":"the-weekend-might-be-over-but-at-least-that-means-its-time-for-zapfic50monday-write-me-a-story-in-precisely-50-words"}]

// ["unmutePost",{"community":"hive-106316","account":"cosmo-kuro","permlink":"ghosts-spirits-and-apparitions-exploring-the-world-of-paranormal-phenomena","notes":"undone for now"}]
// ["mutePost",{"community":"hive-106316","account":"cosmo-kuro","permlink":"ghosts-spirits-and-apparitions-exploring-the-world-of-paranormal-phenomena","notes":"Please read our about before posting here again... Thanks"}]

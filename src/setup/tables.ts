import { pool } from '../helpers/database.ts'

export const setupTables = async () => {
  const client = await pool.connect()
  // Sync data
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.sync_data (
    table_name varchar NOT NULL,
    last_op_id int8 NOT NULL,
    CONSTRAINT hafsql_sync_data_un UNIQUE (table_name)
  );`)

  // Delegations
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.delegations_table (
    delegator varchar(16) NOT NULL,
    delegatee varchar(16) NOT NULL,
    vests varchar NOT NULL,
    CONSTRAINT hafsql_delegations_table_un UNIQUE (delegator, delegatee)
  );`,
  )

  // RC Delegations
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.rc_delegations_table (
    delegator varchar(16) NOT NULL,
    delegatee varchar(16) NOT NULL,
    rc varchar NOT NULL,
    CONSTRAINT hafsql_rc_delegations_table_un UNIQUE (delegator, delegatee)
  );`,
  )

  // Proposal Approvals
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.proposal_approvals_table (
    id int4 NOT NULL,
    voter varchar(16) NOT NULL,
    CONSTRAINT hafsql_proposal_approvals_table_un UNIQUE (id, voter)
  );`,
  )

  // Blacklists
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.blacklists_table (
    blacklister int4 NOT NULL,
    blacklisted int4 NOT NULL,
    CONSTRAINT hafsql_blacklists_table_un UNIQUE (blacklister, blacklisted)
  );`)

  // Blacklist Follows
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.blacklist_follows_table (
    account int4 NOT NULL,
    blacklist int4 NOT NULL,
    CONSTRAINT hafsql_blacklist_follows_table_un UNIQUE (account, blacklist)
  );`,
  )

  // Mute
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.mutes_table (
    muter int4 NOT NULL,
    muted int4 NOT NULL,
    CONSTRAINT hafsql_mutes_table_un UNIQUE (muter, muted)
  );`)

  // Mute Follows
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.mute_follows_table (
    account int4 NOT NULL,
    mute_list int4 NOT NULL,
    CONSTRAINT hafsql_mute_follows_table_un UNIQUE (account, mute_list)
  );`,
  )

  // Reblogs
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.reblogs_table (
    account int4 NOT NULL,
    post int8 NOT NULL,
    CONSTRAINT hafsql_reblogs_table_un UNIQUE (account, post)
  );`)

  // Follows
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.follows_table (
    follower int4 NOT NULL,
    following int4 NOT NULL,
    CONSTRAINT hafsql_follows_table_un UNIQUE (follower, following)
  );`)

  // Comments
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.comments_table (
    id serial4 NOT NULL,
    title varchar NULL,
    body varchar NULL,
    tags jsonb NULL,
    author varchar(16) NOT NULL,
    permlink varchar(255) NOT NULL,
    parent_author varchar(16) NOT NULL,
    parent_permlink varchar(255) NOT NULL,
    metadata jsonb NULL,
    created timestamp NOT NULL,
    last_edited timestamp NULL,
    pending_payout_value numeric(12, 3) NULL DEFAULT 0,
    payout numeric(12, 3) NULL DEFAULT 0,
    author_rewards_hive numeric(12, 3) NULL DEFAULT 0,
    author_rewards_hbd numeric(12, 3) NULL DEFAULT 0,
    curation_rewards numeric(12, 3) NULL DEFAULT 0,
    beneficiary_rewards numeric(12, 3) NULL DEFAULT 0,
    deleted bool NULL DEFAULT false,
    CONSTRAINT hafsql_comments_table_pk PRIMARY KEY (id),
    CONSTRAINT hafsql_comments_table_un UNIQUE (author, permlink)
  );`)

  // Community Roles
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.community_roles_table (
    account int4 NOT NULL,
    community int4 NOT NULL,
    "role" int2 NOT NULL DEFAULT 0,
    title varchar NULL,
    CONSTRAINT hafsql_community_roles_table_un UNIQUE (account, community)
  );`,
  )

  // Community Subs
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.community_subs_table (
    account int4 NOT NULL,
    community int4 NOT NULL,
    CONSTRAINT hafsql_community_subs_table_un UNIQUE (account, community)
  );`,
  )

  // Reputations
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.reputations_table (
    account int4 NOT NULL,
    reputation varchar NOT NULL DEFAULT '0',
    last_update int8 NOT NULL,
    CONSTRAINT hafsql_reputations_table_un UNIQUE (account)
  );`,
  )

  // Vote chache - caching 7 days old votes - needed for reputations
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.votescache_table (
    voter int4 NOT NULL,
    author varchar NOT NULL,
    permlink varchar NOT NULL,
    shares varchar NOT NULL DEFAULT '0',
    timestamp int8 NOT NULL,
    CONSTRAINT hafsql_votescache_table_un UNIQUE (voter, author, permlink)
  );`)

  client.release()

  await setupSyncDataTable()
}

const setupSyncDataTable = async () => {
  using client = await pool.connect()
  const tableNames = [
    'delegations',
    'rc_delegations',
    'proposal_approvals',
    'follows',
    'comments',
    'pending_rewards',
    'paid_rewards',
    'reblogs',
    'communities',
    'delete_comments',
    'reputations',
  ]
  for (let i = 0; i < tableNames.length; i++) {
    const name = tableNames[i]
    const data = await client.queryObject(
      'SELECT last_op_id FROM hafsql.sync_data WHERE table_name = $1',
      [name],
    )
    if (!data.rowCount) {
      await client.queryObject(
        'INSERT INTO hafsql.sync_data(table_name, last_op_id) VALUES($1, $2)',
        [name, 0],
      )
    }
  }
}

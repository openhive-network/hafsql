import { pool } from '../helpers/database.ts'

export const setupTables = async () => {
  const client = await pool.connect()
  // Sync data
  await client.queryObject(`CREATE TABLE IF NOT EXISTS hafsql.sync_data (
    table_name varchar NOT NULL,
    last_block_num int4 NOT NULL DEFAULT 0,
    CONSTRAINT hafsql_sync_data_un UNIQUE (table_name)
  );`)

  // Delegations
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.delegations_table (
      delegator varchar(16) NOT NULL,
      delegatee varchar(16) NOT NULL,
      vests numeric NOT NULL,
      timestamp timestamp NOT NULL,
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
    root_author varchar(16) NULL,
    root_permlink varchar(255) NULL,
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
      reputation int8 NOT NULL DEFAULT 0,
      is_implicit bool NOT NULL DEFAULT TRUE,
      CONSTRAINT hafsql_reputations_table_un UNIQUE (account)
    );`,
  )

  // Balances
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.balances_table (
      account int4 NOT NULL,
      hive numeric(21, 3) NOT NULL DEFAULT 0,
      hbd numeric(21, 3) NOT NULL DEFAULT 0,
      vests numeric(27, 6) NOT NULL DEFAULT 0,
      hive_savings numeric(21, 3) NOT NULL DEFAULT 0,
      hbd_savings numeric(21, 3) NOT NULL DEFAULT 0,
      CONSTRAINT hafsql_balances_table_un UNIQUE (account)
    );`,
  )

  // Balances_history
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.balances_history_table (
      account int4 NOT NULL,
      block_num int4 NOT NULL,
      hive numeric(21, 3) NOT NULL DEFAULT 0,
      hbd numeric(21, 3) NOT NULL DEFAULT 0,
      vests numeric(27, 6) NOT NULL DEFAULT 0,
      hive_savings numeric(21, 3) NOT NULL DEFAULT 0,
      hbd_savings numeric(21, 3) NOT NULL DEFAULT 0,
      CONSTRAINT hafsql_balances_history_table_un UNIQUE (account, block_num)
    );`,
  )

  // Total_balances
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.total_balances_table (
      block_num int4 NOT NULL,
      hive numeric(21, 3) NOT NULL DEFAULT 0,
      hbd numeric(21, 3) NOT NULL DEFAULT 0,
      vests numeric(27, 6) NOT NULL DEFAULT 0,
      hive_savings numeric(21, 3) NOT NULL DEFAULT 0,
      hbd_savings numeric(21, 3) NOT NULL DEFAULT 0,
      CONSTRAINT hafsql_total_balances_table_un UNIQUE (block_num)
    );`,
  )

  // Pending saving withdraws
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.pending_saving_withdraws_table (
      "from" int4 NOT NULL,
      "to" int4 NOT NULL,
      request_id int4 NOT NULL,
      amount numeric(21, 3) NOT NULL,
      symbol varchar NOT NULL,
      CONSTRAINT hafsql_pending_saving_withdraws_table_un UNIQUE ("from", request_id)
    );`,
  )

  // Accounts
  await client.queryObject(
    `CREATE TABLE IF NOT EXISTS hafsql.accounts_table (
      account int4 NOT NULL,
      creator int4,
      owner jsonb,
      active jsonb,
      posting jsonb,
      memo_key varchar,
      json_metadata jsonb,
      posting_metadata jsonb,
      created_at timestamp,
      last_update timestamp,
      last_owner_update timestamp,
      recovery int4,
      reward_hive_balance numeric(21, 3) NOT NULL DEFAULT 0,
      reward_hbd_balance numeric(21, 3) NOT NULL DEFAULT 0,
      reward_vests_balance numeric(27, 6) NOT NULL DEFAULT 0,
      next_vesting_withdrawal timestamp,
      to_withdraw numeric(27, 6) NOT NULL DEFAULT 0,
      vesting_withdraw_rate numeric(27, 6) NOT NULL DEFAULT 0,
      withdrawn numeric(27, 6) NOT NULL DEFAULT 0,
      withdraw_routes jsonb,
      proxy int4,
      CONSTRAINT hafsql_accounts_table_un UNIQUE (account)
    );`,
  )

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
    'balances',
    'accounts',
  ]
  for (let i = 0; i < tableNames.length; i++) {
    const name = tableNames[i]
    const data = await client.queryObject(
      'SELECT table_name FROM hafsql.sync_data WHERE table_name = $1',
      [name],
    )
    if (data.rows.length < 1) {
      const lastNum = 0
      // if (name === 'reblogs') {
      //   lastNum = 4568614
      // }
      await client.queryObject(
        'INSERT INTO hafsql.sync_data(table_name, last_block_num) VALUES($1, $2)',
        [name, lastNum],
      )
    }
  }
}

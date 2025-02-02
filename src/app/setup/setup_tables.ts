import { query } from '../helpers/database.ts'

export const setupTables = async () => {
	// Sync data
	await query(`CREATE TABLE IF NOT EXISTS hafsql.sync_data (
    table_name varchar NOT NULL,
    last_block_num int4 NOT NULL DEFAULT 0,
    CONSTRAINT hafsql_sync_data_un UNIQUE (table_name)
  );`)

	// Delegations
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.delegations_table (
      delegator varchar NOT NULL,
      delegatee varchar NOT NULL,
      vests numeric NOT NULL,
      timestamp timestamptz NOT NULL,
      CONSTRAINT hafsql_delegations_table_un UNIQUE (delegator, delegatee)
    );`,
	)

	// RC Delegations
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.rc_delegations_table (
      delegator varchar NOT NULL,
      delegatee varchar NOT NULL,
      rc varchar NOT NULL,
      timestamp timestamptz NOT NULL,
      CONSTRAINT hafsql_rc_delegations_table_un UNIQUE (delegator, delegatee)
    );`,
	)

	// Proposal Approvals
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.proposal_approvals_table (
      id int4 NOT NULL,
      voter varchar NOT NULL,
      CONSTRAINT hafsql_proposal_approvals_table_un UNIQUE (id, voter)
    );`,
	)

	// Blacklists
	await query(`CREATE TABLE IF NOT EXISTS hafsql.blacklists_table (
    blacklister int4 NOT NULL,
    blacklisted int4 NOT NULL,
    CONSTRAINT hafsql_blacklists_table_un UNIQUE (blacklister, blacklisted)
  );`)

	// Blacklist Follows
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.blacklist_follows_table (
      account int4 NOT NULL,
      blacklist int4 NOT NULL,
      CONSTRAINT hafsql_blacklist_follows_table_un UNIQUE (account, blacklist)
    );`,
	)

	// Mute
	await query(`CREATE TABLE IF NOT EXISTS hafsql.mutes_table (
    muter int4 NOT NULL,
    muted int4 NOT NULL,
    CONSTRAINT hafsql_mutes_table_un UNIQUE (muter, muted)
  );`)

	// Mute Follows
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.mute_follows_table (
      account int4 NOT NULL,
      mute_list int4 NOT NULL,
      CONSTRAINT hafsql_mute_follows_table_un UNIQUE (account, mute_list)
    );`,
	)

	// Reblogs
	await query(`CREATE TABLE IF NOT EXISTS hafsql.reblogs_table (
    account int4 NOT NULL,
    post int8 NOT NULL,
    CONSTRAINT hafsql_reblogs_table_un UNIQUE (account, post)
  );`)

	// Follows
	await query(`CREATE TABLE IF NOT EXISTS hafsql.follows_table (
    follower int4 NOT NULL,
    following int4 NOT NULL,
    CONSTRAINT hafsql_follows_table_un UNIQUE (follower, following)
  );`)

	// Comments
	await query(`CREATE TABLE IF NOT EXISTS hafsql.comments_table (
    id serial4 NOT NULL,
    title varchar NULL,
    body varchar NULL,
    tags jsonb NULL,
    author varchar NOT NULL,
    permlink varchar NOT NULL,
    parent_author varchar NOT NULL,
    parent_permlink varchar NOT NULL,
    category varchar NOT NULL,
    metadata jsonb NULL,
    created timestamptz NOT NULL,
    last_edited timestamptz NULL,
    root_author varchar NULL,
    root_permlink varchar NULL,
    pending_payout_value numeric(21, 3) NULL DEFAULT 0,
    payout numeric(21, 3) NULL DEFAULT 0,
    author_rewards_hive numeric(21, 3) NULL DEFAULT 0,
    author_rewards_hbd numeric(21, 3) NULL DEFAULT 0,
    curation_rewards numeric(21, 3) NULL DEFAULT 0,
    beneficiary_rewards numeric(21, 3) NULL DEFAULT 0,
    deleted bool NULL DEFAULT false,
    CONSTRAINT hafsql_comments_table_pk PRIMARY KEY (id),
    CONSTRAINT hafsql_comments_table_un UNIQUE (author, permlink)
  );`)

	// Community Roles
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.community_roles_table (
      account int4 NOT NULL,
      community int4 NOT NULL,
      "role" int2 NOT NULL DEFAULT 0,
      title varchar NULL,
      CONSTRAINT hafsql_community_roles_table_un UNIQUE (account, community)
    );`,
	)

	// Community Subs
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.community_subs_table (
      account int4 NOT NULL,
      community int4 NOT NULL,
      CONSTRAINT hafsql_community_subs_table_un UNIQUE (account, community)
    );`,
	)

	// Reputations
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.reputations_table (
      account int4 NOT NULL,
      reputation int8 NOT NULL DEFAULT 0,
      is_implicit bool NOT NULL DEFAULT TRUE,
      CONSTRAINT hafsql_reputations_table_un UNIQUE (account)
    );`,
	)

	// Balances
	await query(
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
	await query(
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
	await query(
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
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.pending_saving_withdraws_table (
      "from" int4 NOT NULL,
      "to" int4 NOT NULL,
      request_id int8 NOT NULL,
      amount numeric(21, 3) NOT NULL,
      symbol varchar NOT NULL,
      CONSTRAINT hafsql_pending_saving_withdraws_table_un UNIQUE ("from", request_id)
    );`,
	)

	// Accounts
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.accounts_table (
      account int4 NOT NULL,
      creator int4,
      owner jsonb,
      active jsonb,
      posting jsonb,
      memo_key varchar,
      json_metadata jsonb,
      posting_metadata jsonb,
      created_at timestamptz,
      last_update timestamptz,
      last_owner_update timestamptz,
      recovery int4,
      reward_hive_balance numeric(21, 3) NOT NULL DEFAULT 0,
      reward_hbd_balance numeric(21, 3) NOT NULL DEFAULT 0,
      reward_vests_balance numeric(27, 6) NOT NULL DEFAULT 0,
      next_vesting_withdrawal timestamptz,
      to_withdraw numeric(27, 6) NOT NULL DEFAULT 0,
      vesting_withdraw_rate numeric(27, 6) NOT NULL DEFAULT 0,
      withdrawn numeric(27, 6) NOT NULL DEFAULT 0,
      withdraw_routes jsonb,
      proxy int4,
      CONSTRAINT hafsql_accounts_table_un UNIQUE (account)
    );`,
	)

	// Version
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.version (
      name varchar,
      version varchar,
      CONSTRAINT hafsql_version_table_un UNIQUE (name)
    );`,
	)

	// Market Open Orders
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_open_orders_table (
      owner varchar,
      orderid int8,
      amount numeric(30, 3),
      symbol varchar,
      rate numeric(30,6),
      CONSTRAINT hafsql_market_open_orders_table_un UNIQUE (owner, orderid)
    );`,
	)

	// Market bucket 5m
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_5m_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_5m_table_un UNIQUE (timestamp)
    );`,
	)

	// Market bucket 30m
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_30m_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_30m_table_un UNIQUE (timestamp)
    );`,
	)

	// Market bucket 1h
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_1h_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_1h_table_un UNIQUE (timestamp)
    );`,
	)

	// Market bucket 4h
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_4h_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_4h_table_un UNIQUE (timestamp)
    );`,
	)

	// Market bucket 1d
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_1d_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_1d_table_un UNIQUE (timestamp)
    );`,
	)

	// Market bucket 1w
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_1w_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_1w_table_un UNIQUE (timestamp)
    );`,
	)

	// Market bucket 4w
	await query(
		`CREATE TABLE IF NOT EXISTS hafsql.market_bucket_4w_table (
      timestamp timestamptz,
      open numeric(30,6),
      high numeric(30,6),
      low numeric(30,6),
      close numeric(30,6),
      base_vol numeric(30,3),
      quote_vol numeric(30,3),
      CONSTRAINT hafsql_market_bucket_4w_table_un UNIQUE (timestamp)
    );`,
	)

	await setupSyncDataTable()
}

const setupSyncDataTable = async () => {
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
		'operations',
		'market',
	]
	for (let i = 0; i < tableNames.length; i++) {
		const name = tableNames[i]
		const data = await query(
			'SELECT table_name FROM hafsql.sync_data WHERE table_name = $1',
			[name],
		)
		if (data.rows.length < 1) {
			const lastNum = 0
			// if (name === 'reblogs') {
			//   lastNum = 4568614
			// }
			await query(
				'INSERT INTO hafsql.sync_data(table_name, last_block_num) VALUES($1, $2)',
				[name, lastNum],
			)
		}
	}
}

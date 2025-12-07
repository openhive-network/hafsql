import { query } from '../helpers/database.ts'

export const setupHafsqlViews = async () => {
	// Blocks
	await query(`CREATE OR REPLACE VIEW hafsql.haf_blocks
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    (SELECT a.name FROM hafd.accounts a WHERE a.id = b.producer_account_id) as witness,
    b.extensions as extensions,
    b.signing_key as signing_key,
    encode(b.hash, 'hex'::text) as hash,
    encode(b.prev, 'hex'::text) as prev,
    encode(b.witness_signature, 'hex'::text) as signature,
    encode(b.transaction_merkle_root, 'hex'::text) as transaction_merkle_root
    FROM hafd.blocks b;`)

	// Transactions
	await query(`CREATE OR REPLACE VIEW hafsql.haf_transactions
  AS SELECT x.block_num,
    x.trx_in_block,
    x.trx_hash,
    encode(x.trx_hash, 'hex') AS trx_id,
    x.ref_block_num,
    x.ref_block_prefix,
    x.expiration,
    array_fill(encode(x.signature, 'hex'), array[1]) || array(select encode(tm.signature, 'hex') from hafd.transactions_multisig tm where tm.trx_hash=x.trx_hash) as signatures
    FROM hafd.transactions x;`)

	// DynamicGlobalProperties
	await query(
		`CREATE OR REPLACE VIEW hafsql.dynamic_global_properties
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    b.total_vesting_fund_hive::numeric as total_vesting_fund_hive,
    b.total_vesting_shares::numeric as total_vesting_shares,
    b.total_reward_fund_hive::numeric as total_reward_fund_hive,
    b.virtual_supply::numeric as virtual_supply,
    b.current_supply::numeric as current_supply,
    b.current_hbd_supply::numeric as current_hbd_supply,
    b.hbd_interest_rate::numeric as hbd_interest_rate,
    b.dhf_interval_ledger::numeric as dhf_interval_ledger,
    (b.total_vesting_shares::numeric / b.total_vesting_fund_hive::numeric)/1000 as vests_per_hive
    FROM hafd.blocks b;`,
	)

	// Delegations
	await query(`CREATE OR REPLACE VIEW hafsql.delegations
  AS SELECT a.name as delegator,
    b.name as delegatee,
    x.balance as vests,
    hafsql.vests_to_hive(x.balance/1000000) AS hp_equivalent,
    hafsql.get_timestamp(x.source_op) as "timestamp"
   FROM hafbe_bal.current_accounts_delegations x
   join hafd.accounts a on x.delegator=a.id
   join hafd.accounts b on x.delegatee=b.id;`)

	// RC Delegations
	await query(`CREATE OR REPLACE VIEW hafsql.rc_delegations
  AS SELECT x.delegator,
    x.delegatee,
    x.rc,
    hafsql.rc_to_hive(x.rc::numeric) as hp_equivalent,
    x.timestamp
    FROM hafsql.rc_delegations_table x;`)

	// Comments
	await query(`CREATE OR REPLACE VIEW hafsql.comments
  AS SELECT x.id,
	  x.title,
	  x.body,
    x.author,
    x.permlink,
    x.parent_author,
    x.parent_permlink,
    x.created,
    x.last_edited,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS cashout_time,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (x.created + INTERVAL '7 days') - NOW() AT TIME ZONE 'UTC' ELSE '00:00:00.000' END AS remaining_till_cashout,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) >= '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS last_payout,
    x.tags,
    x.category AS category,
    x.metadata AS json_metadata,
    x.root_author,
    x.root_permlink,
    x.pending_payout_value,
    x.author_rewards_hbd AS author_rewards,
    x.author_rewards_hive AS author_rewards_in_hive,
    x.payout AS total_payout_value,
    x.curation_rewards AS curator_payout_value,
    x.beneficiary_rewards AS beneficiary_payout_value,
    COALESCE((SELECT SUM(rshares) FROM hafsql.operation_effective_comment_vote_view WHERE author=x.author AND permlink=x.permlink), 0) AS total_rshares,
    COALESCE((SELECT SUM(CASE WHEN rshares < 0 THEN -1 * rshares ELSE rshares END) FROM hafsql.operation_effective_comment_vote_view WHERE author=x.author AND permlink=x.permlink), 0) AS net_rshares,
    COALESCE((SELECT total_vote_weight FROM hafsql.operation_effective_comment_vote_view WHERE author=x.author and permlink=x.permlink ORDER BY id DESC LIMIT 1), 0) AS total_vote_weight,
    COALESCE((SELECT extensions->0->'value'->>'beneficiaries' FROM hafsql.operation_comment_options_table WHERE author=x.author and permlink=x.permlink ORDER BY id DESC LIMIT 1), '[]') AS beneficiaries,
    COALESCE((SELECT max_accepted_payout FROM hafsql.operation_comment_options_table WHERE author=x.author and permlink=x.permlink ORDER BY id DESC LIMIT 1), 1000000.0) AS max_accepted_payout,
    COALESCE((SELECT percent_hbd FROM hafsql.operation_comment_options_table WHERE author=x.author and permlink=x.permlink ORDER BY id DESC LIMIT 1), '10000') AS percent_hbd,
    COALESCE((SELECT allow_votes FROM hafsql.operation_comment_options_table WHERE author=x.author and permlink=x.permlink ORDER BY id DESC LIMIT 1), 'true') AS allow_votes,
    COALESCE((SELECT allow_curation_rewards FROM hafsql.operation_comment_options_table WHERE author=x.author and permlink=x.permlink ORDER BY id DESC LIMIT 1), 'true') AS allow_curation_rewards,
    x.deleted
    FROM hafsql.comments_table x;`)

	// Community Subs
	await query(`CREATE OR REPLACE VIEW hafsql.community_subs
  AS SELECT a.haf_id AS account_id,
    b.haf_id AS community_id,
    a.name AS account_name,
    b.name AS community_name,
    hs.created_at,
    hs.block_num
    FROM hivemind_app.hive_subscriptions hs
    JOIN hivemind_app.hive_accounts a ON hs.account_id=a.id
    JOIN hivemind_app.hive_accounts b ON hs.community_id=b.id;`)

	// Community Roles
	await query(`CREATE OR REPLACE VIEW hafsql.community_roles
  AS SELECT a.haf_id AS account_id,
    b.haf_id  AS community_id,
    a.name AS account_name,
    b.name AS community_name,
    hr.created_at,
    hr.role_id,
    CASE WHEN hr.role_id=-2 THEN 'muted' WHEN hr.role_id=8 THEN 'owner' WHEN hr.role_id=2 THEN 'member' WHEN hr.role_id=4 THEN 'mod' WHEN hr.role_id=6 THEN 'admin' ELSE 'guest' END AS role,
    hr.title
    FROM hivemind_app.hive_roles hr
    JOIN hivemind_app.hive_accounts a ON hr.account_id=a.id
    JOIN hivemind_app.hive_accounts b ON hr.community_id=b.id;`)

	// Blacklists
	await query(`CREATE OR REPLACE VIEW hafsql.blacklists
  AS SELECT a.haf_id AS blacklister_id,
    b.haf_id AS blacklisted_id,
    x.block_num,
    a.name AS blacklister_name,
    b.name AS blacklisted_name
    FROM hivemind_app.blacklisted x
    JOIN hivemind_app.hive_accounts a ON x.follower=a.id
    JOIN hivemind_app.hive_accounts b ON x.following=b.id;`)

	// Mutes
	await query(`CREATE OR REPLACE VIEW hafsql.mutes
  AS SELECT a.haf_id AS muter_id,
    b.haf_id AS muted_id,
    x.block_num,
    a.name AS muter_name,
    b.name AS muted_name
    FROM hivemind_app.muted x
    JOIN hivemind_app.hive_accounts a ON x.follower=a.id
    JOIN hivemind_app.hive_accounts b ON x.following=b.id;`)

	// Blacklist Follows
	await query(`CREATE OR REPLACE VIEW hafsql.blacklist_follows
  AS SELECT a.haf_id AS account_id,
    b.haf_id AS blacklist_id,
    x.block_num,
    a.name AS account_name,
    b.name AS blacklist_name
    FROM hivemind_app.follow_blacklisted x
    JOIN hivemind_app.hive_accounts a ON x.follower=a.id
    JOIN hivemind_app.hive_accounts b ON x.following=b.id;`)

	// Mute Follows
	await query(`CREATE OR REPLACE VIEW hafsql.mute_follows
  AS SELECT a.haf_id AS account_id,
    b.haf_id AS mute_list_id,
    x.block_num,
    a.name AS account_name,
    b.name AS mute_list_name
    FROM hivemind_app.follow_muted x
    JOIN hivemind_app.hive_accounts a ON x.follower=a.id
    JOIN hivemind_app.hive_accounts b ON x.following=b.id;`)

	// Follows
	await query(`CREATE OR REPLACE VIEW hafsql.follows
  AS SELECT a.haf_id AS follower_id,
    ab.haf_id AS following_id,
    x.block_num,
    a.name as follower_name,
    ab.name AS following_name
  FROM hivemind_app.follows x
  JOIN hivemind_app.hive_accounts a ON x.follower = a.id
  JOIN hivemind_app.hive_accounts ab ON x.following = ab.id`)

	// Reblogs
	await query(`CREATE OR REPLACE VIEW hafsql.reblogs
  AS SELECT
    s.account_id,
    s.account_name,
    s.post_id,
    s.author,
    hpd."permlink",
    s.block_num,
    s.created_at 
    FROM (SELECT
    a.haf_id AS account_id,
    a."name" AS account_name,
    hr.post_id,
    b.name AS author,
    hr.block_num,
    hr.created_at
    FROM hivemind_app.hive_reblogs hr
    JOIN hivemind_app.hive_posts p ON hr.post_id=p.id 
    JOIN hivemind_app.hive_accounts b ON p.author_id=b.id
    JOIN hivemind_app.hive_accounts a ON hr.blogger_id=a.id
    ) s
    JOIN hivemind_app.hive_permlink_data hpd ON hpd.id=s.post_id`)

	// Proposal Approvlas
	await query(`CREATE OR REPLACE VIEW hafsql.proposal_approvals
  AS SELECT x.id AS proposal_id,
    x.voter
    FROM hafsql.proposal_approvals_table x;`)

	// Reputations
	await query(`CREATE OR REPLACE VIEW hafsql.reputations
  AS SELECT ar.account_id,
    a.name AS account_name,
    ar.reputation,
    ar.is_implicit,
    hafsql.parse_reputation(ar.reputation) as rep
    FROM reptracker_app.account_reputations ar
    JOIN hivemind_app.hive_accounts a ON ar.account_id=a.haf_id;`)

	// Accounts
	await query(`CREATE OR REPLACE VIEW hafsql.accounts
  AS SELECT x.id,
    x.name,
    x.block_num,
    (SELECT ov.timestamp FROM hafsql.operation_vote_view ov WHERE ov.voter = x.name ORDER BY ov.id DESC LIMIT 1) AS last_vote_time,
    (SELECT ct.created FROM hafsql.comments_table ct WHERE ct.author = x.name and ct.parent_author ='' ORDER BY ct.id DESC LIMIT 1) AS last_root_post,
    (SELECT ct.created FROM hafsql.comments_table ct WHERE ct.author = x.name ORDER BY ct.id DESC LIMIT 1) AS last_post,
    (SELECT COUNT(1) FROM hafsql.comments_table ct WHERE ct.author = x.name) AS total_posts,
    (SELECT COUNT(1) FROM hafsql.follows f WHERE f.following_name = x.name) AS followers,
    (SELECT COUNT(1) FROM hafsql.follows f WHERE f.follower_name = x.name) AS followings,
    (SELECT r.rep FROM hafsql.reputations r WHERE r.account_name = x.name) AS reputation,
    (SELECT COALESCE(SUM(d.vests), 0) FROM hafsql.delegations d WHERE d.delegatee = x.name) AS incoming_vests,
    (SELECT COALESCE(SUM(d.hp_equivalent), 0) FROM hafsql.delegations d WHERE d.delegatee = x.name) AS incoming_hp,
    (SELECT COALESCE(SUM(d.vests), 0) FROM hafsql.delegations d WHERE d.delegator = x.name) AS outgoing_vests,
    (SELECT COALESCE(SUM(d.hp_equivalent), 0) FROM hafsql.delegations d WHERE d.delegator = x.name) AS outgoing_hp,
    creatort."name" AS creator,
    ha.created_at,
    ha."owner",
    ha.active,
    ha.posting,
    ha.memo_key,
    ha.json_metadata,
    ha.posting_metadata,
    ha.last_update,
    ha.last_owner_update,
    recoveryt."name" AS "recovery",
    ha.reward_hive_balance,
    ha.reward_hbd_balance,
    ha.reward_vests_balance,
    hafsql.vests_to_hive(ha.reward_vests_balance) AS reward_vests_balance_hp,
    ha.next_vesting_withdrawal,
    ha.to_withdraw,
    ha.vesting_withdraw_rate,
    ha.withdrawn,
    ha.withdraw_routes,
    (SELECT "name" FROM hafd.accounts WHERE id = ha.proxy) AS proxy,
    (SELECT SUM(amount) FROM hafsql.pending_saving_withdraws_table where "from"=x.id AND symbol='hive') AS pending_hive_savings_withdrawal,
    (SELECT SUM(amount) FROM hafsql.pending_saving_withdraws_table where "from"=x.id AND symbol='hbd') AS pending_hbd_savings_withdrawal
    FROM hafd.accounts x, hafsql.accounts_table ha, hafd.accounts creatort, hafd.accounts recoveryt
    WHERE x.id = ha.account
    AND ha.creator = creatort.id
    AND ha."recovery" = recoveryt.id;`)

	// Operations
	await query(`CREATE OR REPLACE VIEW hafsql.haf_operations
  AS SELECT x.id,
    hafd.operation_id_to_block_num(x.id) AS block_num,
    x.trx_in_block,
    x.op_pos,
    hafd.operation_id_to_type_id(x.id) AS op_type_id,
    hb.created_at AS "timestamp",
    x.body_binary::jsonb as body,
    hafsql.get_trx_id(x.id) as included_trx_id
    FROM hafd.operations x
    JOIN hafd.blocks hb ON hb.num = hafd.operation_id_to_block_num(x.id);`)

	// Operation Types
	await query(`CREATE OR REPLACE VIEW hafsql.haf_operation_types
  AS SELECT x.id,
    x.name,
    x.is_virtual 
    FROM hafd.operation_types x;`)

	// Applied Hardforks
	await query(`CREATE OR REPLACE VIEW hafsql.haf_applied_hardforks
  AS SELECT x.hardfork_num,
    x.block_num,
    x.hardfork_vop_id
    FROM hafd.applied_hardforks x;`)

	// Balances
	await query(`CREATE OR REPLACE VIEW hafsql.balances
  AS SELECT
      a.id AS account_id,
      a.name AS account_name,
      COALESCE(MAX(CASE WHEN cab.nai = 21 THEN cab.balance END), 0.0)/1000 AS hive,
      COALESCE(MAX(CASE WHEN cab.nai = 13 THEN cab.balance END), 0.0)/1000 AS hbd,
      COALESCE(MAX(CASE WHEN cab.nai = 37 THEN cab.balance END), 0.0)/1000000 AS vests,
      hafsql.vests_to_hive(COALESCE(MAX(CASE WHEN cab.nai = 37 THEN cab.balance END), 0)/1000000) as hp_equivalent,
      COALESCE(MAX(CASE WHEN ss.nai = 21 THEN ss.balance END), 0.0)/1000 AS hive_savings,
      COALESCE(MAX(CASE WHEN ss.nai = 13 THEN ss.balance END), 0.0)/1000 AS hbd_savings
    FROM hafd.accounts a
    LEFT JOIN hafbe_bal.current_account_balances cab
          ON cab.account = a.id
          AND cab.nai IN (21, 13, 37)
    LEFT JOIN hafbe_bal.account_savings ss
          ON ss.account = a.id
          AND ss.nai IN (21, 13)
    GROUP BY a.id, a.name
    ORDER BY a.id;`)

	// Balances history
	await query(`CREATE OR REPLACE VIEW hafsql.balances_history
  AS WITH base AS (
    SELECT
      e.*,
      hafd.operation_id_to_block_num(e.source_op) AS block_num
    FROM hafbe_bal.account_balance_history e
  )
  SELECT
    a.name,
    base.block_num,
    hbd.balance AS hbd,
    hive.balance AS hive,
    vests.balance AS vests,
    hive_savings.balance AS hive_savings,
    hbd_savings.balance AS hbd_savings,
    base.hive_rowid
  FROM base
  JOIN hafd.accounts a ON a.id = base.account
  LEFT JOIN LATERAL (
    SELECT balance
    FROM hafbe_bal.account_balance_history
    WHERE account = base.account
      AND nai = 13
      AND hafd.operation_id_to_block_num(source_op) <= base.block_num
    ORDER BY hafd.operation_id_to_block_num(source_op) DESC, source_op DESC
    LIMIT 1
  ) hbd ON true
  LEFT JOIN LATERAL (
    SELECT balance
    FROM hafbe_bal.account_balance_history
    WHERE account = base.account
      AND nai = 21
      AND hafd.operation_id_to_block_num(source_op) <= base.block_num
    ORDER BY hafd.operation_id_to_block_num(source_op) DESC, source_op DESC
    LIMIT 1
  ) hive ON true
  LEFT JOIN LATERAL (
    SELECT balance
    FROM hafbe_bal.account_balance_history
    WHERE account = base.account
      AND nai = 37
      AND hafd.operation_id_to_block_num(source_op) <= base.block_num
    ORDER BY hafd.operation_id_to_block_num(source_op) DESC, source_op DESC
    LIMIT 1
  ) vests ON true
  LEFT JOIN LATERAL (
    SELECT balance
    FROM hafbe_bal.account_savings_history
    WHERE account = base.account
      AND nai = 21
      AND hafd.operation_id_to_block_num(source_op) <= base.block_num
    ORDER BY hafd.operation_id_to_block_num(source_op) DESC, source_op DESC
    LIMIT 1
  ) hive_savings ON true
  LEFT JOIN LATERAL (
    SELECT balance
    FROM hafbe_bal.account_savings_history
    WHERE account = base.account
      AND nai = 13
      AND hafd.operation_id_to_block_num(source_op) <= base.block_num
    ORDER BY hafd.operation_id_to_block_num(source_op) DESC, source_op DESC
    LIMIT 1
  ) hbd_savings ON true;`)

	// Total balances
	await query(`CREATE OR REPLACE VIEW hafsql.total_balances
  AS SELECT *, hafsql.vests_to_hive(vests_balance) AS hp_equivalent FROM
  (SELECT
  SUM(CASE WHEN nai=13 THEN balance ELSE 0 END)/1000.0 AS hbd_balance,
  SUM(CASE WHEN nai=21 THEN balance ELSE 0 END)/1000.0 AS hive_balance,
  SUM(CASE WHEN nai=37 THEN balance ELSE 0 END)/1000000.0 AS vests_balance
  FROM hafbe_bal.current_account_balances cab),
  (SELECT
  SUM(CASE WHEN nai=13 THEN balance ELSE 0 END)/1000.0 AS hbd_savings,
  SUM(CASE WHEN nai=21 THEN balance ELSE 0 END)/1000.0 AS hive_savings
  FROM hafbe_bal.account_savings t);`)

	// haf_account_operations
	await query(`CREATE OR REPLACE VIEW hafsql.haf_account_operations
  AS SELECT
    account_id,
    a."name" AS account_name,
    account_op_seq_no,
    operation_id
    FROM hafd.account_operations
    join hafd.accounts a ON account_id = a.id;`)

	// producer_rewards
	await query(`CREATE MATERIALIZED VIEW IF NOT EXISTS hafsql.producer_rewards
  AS SELECT
    producer,
    hafsql.vests_to_hive(SUM(CASE WHEN vesting_shares_symbol = 'VESTS' THEN vesting_shares ELSE 0 END))
    + SUM(CASE WHEN vesting_shares_symbol = 'HIVE' THEN vesting_shares ELSE 0 END) as producer_rewards_hp
  FROM hafsql.operation_producer_reward_table
  GROUP BY producer`)
	await query(
		'CREATE UNIQUE INDEX IF NOT EXISTS producer_rewards_producer_idx ON hafsql.producer_rewards (producer);',
	)
}

export const removeExtraViews = async () => {
	await query(`DROP VIEW IF EXISTS
    hafsql.haf_blocks,
    hafsql.haf_transactions,
    hafsql.dynamic_global_properties,
    hafsql.delegations,
    hafsql.rc_delegations,
    hafsql.comments,
    hafsql.blacklists,
    hafsql.mutes,
    hafsql.blacklist_follows,
    hafsql.mute_follows,
    hafsql.follows,
    hafsql.reblogs,
    hafsql.proposal_approvals,
    hafsql.accounts,
    hafsql.haf_operations,
    hafsql.haf_operation_types,
    hafsql.haf_applied_hardforks,
    hafsql.community_subs,
    hafsql.community_roles,
    hafsql.reputations,
    hafsql.balances,
    hafsql.total_balances,
    hafsql.haf_account_operations;`)
	await query('DROP MATERIALIZED VIEW IF EXISTS hafsql.producer_rewards;')
}

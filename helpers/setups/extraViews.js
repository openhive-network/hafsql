import { pool } from '../database.js'

export const setupExtraViews = async () => {
  // Blocks
  await pool.query(`CREATE OR REPLACE VIEW hafsql.blocks
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    b.producer_account_id as witness,
    b.extensions as extensions,
    b.signing_key as signing_key,
    encode(b.hash, 'hex'::text) as hash,
    encode(b.prev, 'hex'::text) as prev,
    encode(b.witness_signature, 'hex'::text) as signature,
    encode(b.transaction_merkle_root, 'hex'::text) as transaction_merkle_root
    FROM hive.blocks b;`)

  // Transactions
  await pool.query(`CREATE OR REPLACE VIEW hafsql.transactions
  AS SELECT x.block_num,
    x.trx_in_block,
    x.trx_hash AS trx_id,
    x.ref_block_num,
    x.ref_block_prefix,
    x.expiration,
    array_fill(encode(x.signature, 'hex'), array[1]) || array(select encode(tm.signature, 'hex') from hive.transactions_multisig tm where tm.trx_hash=x.trx_hash) as signatures
    FROM hive.transactions x;`)

  // DynamicGlobalProperties
  await pool.query(`CREATE OR REPLACE VIEW hafsql.dynamic_global_properties
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    b.total_vesting_fund_hive as total_vesting_fund_hive,
    b.total_vesting_shares as total_vesting_shares,
    b.total_reward_fund_hive as total_reward_fund_hive,
    b.virtual_supply as virtual_supply,
    b.current_supply as current_supply,
    b.current_hbd_supply as current_hbd_supply,
    b.hbd_interest_rate as hbd_interest_rate,
    b.dhf_interval_ledger as dhf_interval_ledger
    FROM hive.blocks b;`)

  // Delegations
  await pool.query(`CREATE OR REPLACE VIEW hafsql.delegations
  AS SELECT x.delegator,
    x.delegatee,
    x.vests
    FROM hafsql.delegations_table x;`)

  // RC Delegations
  await pool.query(`CREATE OR REPLACE VIEW hafsql.rc_delegations
  AS SELECT x.delegator,
    x.delegatee,
    x.rc
    FROM hafsql.rc_delegations_table x;`)

  // Comments
  await pool.query(`CREATE OR REPLACE VIEW hafsql.comments
  AS SELECT x.id,
    x.author,
    x.permlink,
    (SELECT parent_author FROM hafsql.op_comment WHERE op_id=x.last_op_id) AS parent_author,
    (SELECT parent_permlink FROM hafsql.op_comment WHERE op_id=x.last_op_id) AS parent_permlink,
    (SELECT title FROM hafsql.op_comment WHERE op_id=x.last_op_id) AS title,
    CASE WHEN x.body_edited = true THEN x.body ELSE (SELECT body FROM hafsql.op_comment WHERE op_id=x.last_op_id) END AS body,
    x.created,
    (SELECT "timestamp" FROM hafsql.op_comment WHERE op_id=x.last_op_id) AS edited,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS cashout_time,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (NOW() AT TIME ZONE 'UTC' - x.created) ELSE '00:00:00.000' END AS remaining_till_cashout,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) >= '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS last_payout,
    x.tags,
    (SELECT json_metadata FROM hafsql.op_comment WHERE op_id=x.last_op_id) AS json_metadata,
    x.pending_payout_value,
    COALESCE((SELECT author_rewards FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), '0') AS author_rewards,
    COALESCE((SELECT total_payout_value FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), 0) AS total_payout_value,
    COALESCE((SELECT curator_payout_value FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), 0) AS curator_payout_value,
    COALESCE((SELECT beneficiary_payout_value FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), 0) AS beneficiary_payout_value,
    COALESCE((SELECT extensions::jsonb->0->'value'->>'beneficiaries' FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), '[]') AS beneficiaries,
    COALESCE((SELECT max_accepted_payout FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 1000000.0) AS max_accepted_payout,
    COALESCE((SELECT percent_hbd FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), '10000') AS percent_hbd,
    COALESCE((SELECT allow_votes FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 'true') AS allow_votes,
    COALESCE((SELECT allow_curation_rewards FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 'true') AS allow_curation_rewards
    FROM hafsql.comments_table x;`)

  // Community Subs
  await pool.query(`CREATE OR REPLACE VIEW hafsql.community_subs
  AS SELECT c.account,
    c.community
    FROM hafsql.community_subs_table c;`)

  // Community Roles
  await pool.query(`CREATE OR REPLACE VIEW hafsql.community_roles
  AS SELECT c.account,
    c.community,
    CASE WHEN c.role=-2 THEN 'muted' WHEN c.role=8 THEN 'owner' WHEN c.role=2 THEN 'member' WHEN c.role=4 THEN 'mod' WHEN c.role=6 THEN 'admin' ELSE 'guest' END AS role,
    c.title
    FROM hafsql.community_roles_table c;`)

  // Blacklists
  await pool.query(`CREATE OR REPLACE VIEW hafsql.blacklists
  AS SELECT x.blacklister AS blacklister_id,
    x.blacklisted AS blacklisted_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.blacklister) AS blacklister_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.blacklisted) AS blacklisted_name
    FROM hafsql.blacklists_table x;`)

  // Mutes
  await pool.query(`CREATE OR REPLACE VIEW hafsql.mutes
  AS SELECT x.muter AS muter_id,
    x.muted AS muted_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.muter) AS muter_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.muted) AS muted_name
    FROM hafsql.mutes_table x;`)

  // Blacklist Follows
  await pool.query(`CREATE OR REPLACE VIEW hafsql.blacklist_follows
  AS SELECT x.account AS account_id,
    x.blacklist AS blacklist_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.account) AS account_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.blacklist) AS blacklist_name
    FROM hafsql.blacklist_follows_table x;`)

  // Mute Follows
  await pool.query(`CREATE OR REPLACE VIEW hafsql.mute_follows
  AS SELECT x.account AS account_id,
    x.mute_list AS mute_list_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.account) AS account_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.mute_list) AS mute_list_name
    FROM hafsql.mute_follows_table x;`)

  // Follows
  await pool.query(`CREATE OR REPLACE VIEW hafsql.follows
  AS SELECT x.follower AS follower_id,
    x.following AS following_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.follower) AS follower_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.following) AS following_name
    FROM hafsql.follows_table x;`)

  // Reblogs
  await pool.query(`CREATE OR REPLACE VIEW hafsql.reblogs
  AS SELECT x.account AS account_id,
    x.post AS post_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.account) AS account_name
    FROM hafsql.reblogs_table x;`)

  // Proposal Approvlas
  await pool.query(`CREATE OR REPLACE VIEW hafsql.proposal_approvals
  AS SELECT x.id AS proposal_id,
    x.voter
    FROM hafsql.proposal_approvals_table x;`)

  // Accounts
  await pool.query(`CREATE OR REPLACE VIEW hafsql.accounts
  AS SELECT x.id,
    x.name
    FROM hive.accounts x;`)

  // Operations
  await pool.query(`CREATE OR REPLACE VIEW hafsql.operations
  AS SELECT x.id,
    x.block_num,
    x.trx_in_block,
    x.op_pos,
    x.op_type_id,
    x.timestamp,
    x.body
    FROM hive.operations x;`)

  // Operation Types
  await pool.query(`CREATE OR REPLACE VIEW hafsql.operation_types
  AS SELECT x.id,
    x.name,
    x.is_virtual 
    FROM hive.operation_types x;`)

  // Applied Hardforks
  await pool.query(`CREATE OR REPLACE VIEW hafsql.applied_hardforks
  AS SELECT x.hardfork_num,
    x.block_num,
    x.hardfork_vop_id
    FROM hive.applied_hardforks x;`)
}

export const removeExtraViews = async () => {
  await pool.query(`DROP VIEW IF EXISTS
    hafsql.blocks,
    hafsql.transactions,
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
    hafsql.operations,
    hafsql.operation_types,
    hafsql.applied_hardforks,
    hafsql.community_subs,
    hafsql.community_roles;`
  )
}

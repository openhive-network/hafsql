import { pool } from '../helpers/database.ts'

export const setupExtraViews = async () => {
  using client = await pool.connect()
  // Blocks
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.blocks
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
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.transactions
  AS SELECT x.block_num,
    x.trx_in_block,
    x.trx_hash AS trx_id,
    x.ref_block_num,
    x.ref_block_prefix,
    x.expiration,
    array_fill(encode(x.signature, 'hex'), array[1]) || array(select encode(tm.signature, 'hex') from hive.transactions_multisig tm where tm.trx_hash=x.trx_hash) as signatures
    FROM hive.transactions x;`)

  // DynamicGlobalProperties
  await client.queryObject(
    `CREATE OR REPLACE VIEW hafsql.dynamic_global_properties
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    b.total_vesting_fund_hive::text as total_vesting_fund_hive,
    b.total_vesting_shares::text as total_vesting_shares,
    b.total_reward_fund_hive::text as total_reward_fund_hive,
    b.virtual_supply::text as virtual_supply,
    b.current_supply::text as current_supply,
    b.current_hbd_supply::text as current_hbd_supply,
    b.hbd_interest_rate::text as hbd_interest_rate,
    b.dhf_interval_ledger::text as dhf_interval_ledger,
    (b.total_vesting_shares::numeric / b.total_vesting_fund_hive::numeric)/1000 as vests_per_hive
    FROM hive.blocks b;`,
  )

  // Delegations
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.delegations
  AS SELECT x.delegator,
    x.delegatee,
    x.vests,
    hafsql.vests_to_hive(x.vests) as hp
    FROM hafsql.delegations_table x;`)

  // RC Delegations
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.rc_delegations
  AS SELECT x.delegator,
    x.delegatee,
    x.rc,
    hafsql.vests_to_hive(x.rc) as hp
    FROM hafsql.rc_delegations_table x;`)

  // Comments
  // await client.queryObject(`CREATE OR REPLACE VIEW hafsql.comments
  // AS SELECT x.id,
  //   x.author,
  //   x.permlink,
  //   x.parent_author,
  //   x.parent_permlink,
  //   x.title,
  //   x.body,
  //   x.created,
  //   x.edited,
  //   CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS cashout_time,
  //   CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (x.created + INTERVAL '7 days') - NOW() AT TIME ZONE 'UTC' ELSE '00:00:00.000' END AS remaining_till_cashout,
  //   CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) >= '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS last_payout,
  //   x.tags,
  //   x.metadata AS json_metadata,
  //   x.pending_payout_value,
  //   COALESCE((SELECT SUM(author_rewards::int8) FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), '0') AS author_rewards,
  //   COALESCE((SELECT MAX(total_payout_value) FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), 0) AS total_payout_value,
  //   COALESCE((SELECT MAX(curator_payout_value) FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), 0) AS curator_payout_value,
  //   COALESCE((SELECT MAX(beneficiary_payout_value) FROM hafsql.vo_comment_reward WHERE author=x.author and permlink=x.permlink), 0) AS beneficiary_payout_value,
  //   COALESCE((SELECT extensions::jsonb->0->'value'->>'beneficiaries' FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), '[]') AS beneficiaries,
  //   COALESCE((SELECT max_accepted_payout FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 1000000.0) AS max_accepted_payout,
  //   COALESCE((SELECT percent_hbd FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), '10000') AS percent_hbd,
  //   COALESCE((SELECT allow_votes FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 'true') AS allow_votes,
  //   COALESCE((SELECT allow_curation_rewards FROM hafsql.op_comment_options WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 'true') AS allow_curation_rewards,
  //   x.deleted
  //   FROM hafsql.comments_table x;`)

  // Community Subs
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.community_subs
  AS SELECT c.account AS account_id,
    c.community AS community_id,
    (SELECT a.name FROM hive.accounts a WHERE id=c.account) AS account_name,
    (SELECT a.name FROM hive.accounts a WHERE id=c.community) AS community_name
    FROM hafsql.community_subs_table c;`)

  // Community Roles
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.community_roles
  AS SELECT c.account AS account_id,
    c.community AS community_id,
    (SELECT a.name FROM hive.accounts a WHERE id=c.account) AS account_name,
    (SELECT a.name FROM hive.accounts a WHERE id=c.community) AS community_name,
    CASE WHEN c.role=-2 THEN 'muted' WHEN c.role=8 THEN 'owner' WHEN c.role=2 THEN 'member' WHEN c.role=4 THEN 'mod' WHEN c.role=6 THEN 'admin' ELSE 'guest' END AS role,
    c.title
    FROM hafsql.community_roles_table c;`)

  // Blacklists
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.blacklists
  AS SELECT x.blacklister AS blacklister_id,
    x.blacklisted AS blacklisted_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.blacklister) AS blacklister_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.blacklisted) AS blacklisted_name
    FROM hafsql.blacklists_table x;`)

  // Mutes
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.mutes
  AS SELECT x.muter AS muter_id,
    x.muted AS muted_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.muter) AS muter_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.muted) AS muted_name
    FROM hafsql.mutes_table x;`)

  // Blacklist Follows
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.blacklist_follows
  AS SELECT x.account AS account_id,
    x.blacklist AS blacklist_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.account) AS account_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.blacklist) AS blacklist_name
    FROM hafsql.blacklist_follows_table x;`)

  // Mute Follows
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.mute_follows
  AS SELECT x.account AS account_id,
    x.mute_list AS mute_list_id,
    (SELECT a.name FROM hive.accounts a WHERE id=x.account) AS account_name,
    (SELECT a.name FROM hive.accounts a WHERE id=x.mute_list) AS mute_list_name
    FROM hafsql.mute_follows_table x;`)

  // Follows
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.follows
  AS SELECT x.follower AS follower_id,
    x.following AS following_id,
    a.name as follower_name,
    ab.name AS following_name
  FROM hafsql.follows_table x
  JOIN hive.accounts a ON x.follower = a.id
  JOIN hive.accounts ab ON x.following = ab.id;`)

  // Reblogs
  // await client.queryObject(`CREATE OR REPLACE VIEW hafsql.reblogs
  // AS SELECT x.account AS account_id,
  //   x.post AS post_id,
  //   a.name AS account_name,
  //   c.author,
  //   c.permlink
  //   FROM hafsql.reblogs_table x
  //   JOIN hive.accounts a ON x.account = a.id
  //   JOIN hafsql.comments c ON c.id = x.post;`)

  // Proposal Approvlas
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.proposal_approvals
  AS SELECT x.id AS proposal_id,
    x.voter
    FROM hafsql.proposal_approvals_table x;`)

  // Accounts
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.accounts
  AS SELECT x.id,
    x.name
    FROM hive.accounts x;`)

  // Operations
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.operations
  AS SELECT x.id,
    hive.operation_id_to_block_num(x.id) AS block_num,
    x.trx_in_block,
    x.op_pos,
    hive.operation_id_to_type_id(x.id) AS op_type_id,
    hb.created_at AS "timestamp",
    x.body_binary::jsonb
    FROM hive.operations x
    JOIN hive.blocks hb ON hb.num = hive.operation_id_to_block_num(x.id);`)

  // Operation Types
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.operation_types
  AS SELECT x.id,
    x.name,
    x.is_virtual 
    FROM hive.operation_types x;`)

  // Applied Hardforks
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.applied_hardforks
  AS SELECT x.hardfork_num,
    x.block_num,
    x.hardfork_vop_id
    FROM hive.applied_hardforks x;`)

  // Reputations
  await client.queryObject(`CREATE OR REPLACE VIEW hafsql.reputations
  AS SELECT x.account as account_id,
    (SELECT name FROM hafsql.accounts WHERE id=x.account) as account_name,
    x.reputation,
    x.last_update
    FROM hafsql.reputations_table x;`)
}

export const removeExtraViews = async () => {
  using client = await pool.connect()
  await client.queryObject(`DROP VIEW IF EXISTS
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
    hafsql.community_roles,
    hafsql.reputations;`)
}

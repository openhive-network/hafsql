import { pool } from '../database.js'

export const setupExtraViews = async () => {
  await removeExtraViews()
  // Blocks
  await pool.query(`CREATE OR REPLACE VIEW hafsql."Blocks"
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
  await pool.query(`CREATE OR REPLACE VIEW hafsql."Transactions"
  AS SELECT x.block_num,
    x.trx_in_block,
    x.trx_hash AS trx_id,
    x.ref_block_num,
    x.ref_block_prefix,
    x.expiration,
    x.signature
    FROM hive.transactions x;`)

  // DynamicGlobalProperties
  await pool.query(`CREATE OR REPLACE VIEW hafsql."DynamicGlobalProperties"
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
  await pool.query(`CREATE OR REPLACE VIEW hafsql."Delegations"
  AS SELECT x.delegator,
    x.delegatee,
    x.vests
    FROM hafsql.delegations_table x;`)

  // Comments
  await pool.query(`CREATE OR REPLACE VIEW hafsql."Comments"
  AS SELECT x.id,
    x.author,
    x.permlink,
    (SELECT parent_author FROM hafsql."TxComment" WHERE op_id=x.last_op_id) AS parent_author,
    (SELECT parent_permlink FROM hafsql."TxComment" WHERE op_id=x.last_op_id) AS parent_permlink,
    (SELECT title FROM hafsql."TxComment" WHERE op_id=x.last_op_id) AS title,
    CASE WHEN x.body_edited = true THEN x.body ELSE (SELECT body FROM hafsql."TxComment" WHERE op_id=x.last_op_id) END AS body,
    x.created,
    (SELECT "timestamp" FROM hafsql."TxComment" WHERE op_id=x.last_op_id) AS edited,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS cashout_time,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) < '7 days' THEN (NOW() AT TIME ZONE 'UTC' - x.created) ELSE '00:00:00.000' END AS remaining_till_cashout,
    CASE WHEN (NOW() AT TIME ZONE 'UTC' - x.created) >= '7 days' THEN (x.created + INTERVAL '7 days') ELSE '1969-12-31 23:59:59' END AS last_payout,
    x.tags,
    (SELECT json_metadata FROM hafsql."TxComment" WHERE op_id=x.last_op_id) AS json_metadata,
    x.pending_payout_value,
    COALESCE((SELECT author_rewards FROM hafsql."VOCommentReward" WHERE author=x.author and permlink=x.permlink), '0') AS author_rewards,
    COALESCE((SELECT total_payout_value FROM hafsql."VOCommentReward" WHERE author=x.author and permlink=x.permlink), 0) AS total_payout_value,
    COALESCE((SELECT curator_payout_value FROM hafsql."VOCommentReward" WHERE author=x.author and permlink=x.permlink), 0) AS curator_payout_value,
    COALESCE((SELECT beneficiary_payout_value FROM hafsql."VOCommentReward" WHERE author=x.author and permlink=x.permlink), 0) AS beneficiary_payout_value,
    COALESCE((SELECT extensions::jsonb->0->'value'->>'beneficiaries' FROM hafsql."TxCommentOptions" WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), '[]') AS beneficiaries,
    COALESCE((SELECT max_accepted_payout FROM hafsql."TxCommentOptions" WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 1000000.0) AS max_accepted_payout,
    COALESCE((SELECT percent_hbd FROM hafsql."TxCommentOptions" WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), '10000') AS percent_hbd,
    COALESCE((SELECT allow_votes FROM hafsql."TxCommentOptions" WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 'true') AS allow_votes,
    COALESCE((SELECT allow_curation_rewards FROM hafsql."TxCommentOptions" WHERE author=x.author and permlink=x.permlink ORDER BY op_id DESC LIMIT 1), 'true') AS allow_curation_rewards
    FROM hafsql.comments_table x;`)

  // Community Subs
  await pool.query(`CREATE OR REPLACE VIEW hafsql."CommunitySubs"
  AS SELECT c.account,
    c.community
    FROM hafsql.community_subs_table c;`)

  // Community Roles
  await pool.query(`CREATE OR REPLACE VIEW hafsql."CommunityRoles"
  AS SELECT c.account,
    c.community,
    CASE WHEN c.role=-2 THEN 'muted' WHEN c.role=8 THEN 'owner' WHEN c.role=2 THEN 'member' WHEN c.role=4 THEN 'mod' WHEN c.role=6 THEN 'admin' ELSE 'guest' END AS role,
    c.title
    FROM hafsql.community_roles_table c;`)
}

const removeExtraViews = async () => {
  await pool.query(`DROP VIEW IF EXISTS
    hafsql."Blocks",
    hafsql."Transactions",
    hafsql."DynamicGlobalProperties",
    hafsql."Delegations",
    hafsql."Comments",
    hafsql."CommunitySubs",
    hafsql."CommunityRoles";`)
}

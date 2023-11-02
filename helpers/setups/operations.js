import { pool } from '../database.js'

export const setupOperationViews = async () => {
  const OpVote = `CREATE OR REPLACE VIEW hafsql.op_vote
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'voter'::text AS "voter",
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS "author",
      (o.body_binary::jsonb -> 'value'::text) ->> 'weight'::text AS "weight",
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink"
    FROM hive.operations o
    WHERE o.op_type_id = 0;`
  await pool.query(OpVote)

  const OpComment = `CREATE OR REPLACE VIEW hafsql.op_comment
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS "author",
    (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    (o.body_binary::jsonb -> 'value'::text) ->> 'parent_author'::text AS "parent_author",
    (o.body_binary::jsonb -> 'value'::text) ->> 'parent_permlink'::text AS "parent_permlink",
    (o.body_binary::jsonb -> 'value'::text) ->> 'title'::text AS "title",
    (o.body_binary::jsonb -> 'value'::text) ->> 'body'::text AS "body",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata"
    FROM hive.operations o
    WHERE o.op_type_id = 1;`
  await pool.query(OpComment)

  const OpTransfer = `CREATE OR REPLACE VIEW hafsql.op_transfer
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS "memo"
    FROM hive.operations o
    WHERE o.op_type_id = 2;`
  await pool.query(OpTransfer)

  const OpTransferToVesting = `CREATE OR REPLACE VIEW hafsql.op_transfer_to_vesting
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount"
    FROM hive.operations o
    WHERE o.op_type_id = 3;`
  await pool.query(OpTransferToVesting)

  const OpWithdrawVesting = `CREATE OR REPLACE VIEW hafsql.op_withdraw_vesting
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS "vesting_shares"
    FROM hive.operations o
    WHERE o.op_type_id = 4;`
  await pool.query(OpWithdrawVesting)

  const OpLimitOrderCreate = `CREATE OR REPLACE VIEW hafsql.op_limit_order_create
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'orderid'::text AS "orderid",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount_to_sell'::text AS "amount_to_sell",
    (o.body_binary::jsonb -> 'value'::text) ->> 'min_to_receive'::text AS "min_to_receive",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fill_or_kill'::text AS "fill_or_kill",
    (o.body_binary::jsonb -> 'value'::text) ->> 'expiration'::text AS "expiration"
    FROM hive.operations o
    WHERE o.op_type_id = 5;`
  await pool.query(OpLimitOrderCreate)

  const OpLimitOrderCancel = `CREATE OR REPLACE VIEW hafsql.op_limit_order_cancel
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'orderid'::text AS "orderid"
    FROM hive.operations o
    WHERE o.op_type_id = 6;`
  await pool.query(OpLimitOrderCancel)

  const OpFeedPublish = `CREATE OR REPLACE VIEW hafsql.op_feed_publish
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'publisher'::text AS "publisher",
    (o.body_binary::jsonb -> 'value'::text) ->> 'exchange_rate'::text AS "exchange_rate",
    (o.body_binary::jsonb -> 'value'::text) ->> 'quote'::text AS "quote"
    FROM hive.operations o
    WHERE o.op_type_id = 7;`
  await pool.query(OpFeedPublish)

  const OpConvert = `CREATE OR REPLACE VIEW hafsql.op_convert
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'requestid'::text AS "requestid",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount"
    FROM hive.operations o
    WHERE o.op_type_id = 8;`
  await pool.query(OpConvert)

  const OpAccountCreate = `CREATE OR REPLACE VIEW hafsql.op_account_create
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'new_account_name'::text AS "new_account_name",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body_binary::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo_key'::text AS "memo_key",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata"
    FROM hive.operations o
    WHERE o.op_type_id = 9;`
  await pool.query(OpAccountCreate)

  const OpAccountUpdate = `CREATE OR REPLACE VIEW hafsql.op_account_update
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body_binary::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo_key'::text AS "memo_key",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata"
    FROM hive.operations o
    WHERE o.op_type_id = 10;`
  await pool.query(OpAccountUpdate)

  const OpWitnessUpdate = `CREATE OR REPLACE VIEW hafsql.op_witness_update
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'url'::text AS "url",
    (o.body_binary::jsonb -> 'value'::text) ->> 'block_signing_key'::text AS "block_signing_key",
    (o.body_binary::jsonb -> 'value'::text) ->> 'props'::text AS "posting",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS "fee"
    FROM hive.operations o
    WHERE o.op_type_id = 11;`
  await pool.query(OpWitnessUpdate)

  const OpAccountWitnessVote = `CREATE OR REPLACE VIEW hafsql.op_account_witness_vote
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'witness'::text AS "witness",
    (o.body_binary::jsonb -> 'value'::text) ->> 'approve'::text AS "approve"
    FROM hive.operations o
    WHERE o.op_type_id = 12;`
  await pool.query(OpAccountWitnessVote)

  const OpAccountWitnessProxy = `CREATE OR REPLACE VIEW hafsql.op_account_witness_proxy
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'proxy'::text AS "proxy"
    FROM hive.operations o
    WHERE o.op_type_id = 13;`
  await pool.query(OpAccountWitnessProxy)

  const OpPow = `CREATE OR REPLACE VIEW hafsql.op_pow
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'worker_account'::text AS "worker_account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'block_id'::text AS "block_id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'nonce'::text AS "nonce",
    (o.body_binary::jsonb -> 'value'::text) ->> 'work'::text AS "work",
    (o.body_binary::jsonb -> 'value'::text) ->> 'props'::text AS "props"
    FROM hive.operations o
    WHERE o.op_type_id = 14;`
  await pool.query(OpPow)

  const OpCustom = `CREATE OR REPLACE VIEW hafsql.op_custom
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) -> 'required_auths' AS "required_auths",
    (o.body_binary::jsonb -> 'value'::text) ->> 'id'::text AS "id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'data'::text AS "data"
    FROM hive.operations o
    WHERE o.op_type_id = 15;`
  await pool.query(OpCustom)

  // skipping op_type_id: 16 - witness_block_approve has never been broadcasted apprantly

  const OpDeleteComment = `CREATE OR REPLACE VIEW hafsql.op_delete_comment
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS "author",
    (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink"
    FROM hive.operations o
    WHERE o.op_type_id = 17;`
  await pool.query(OpDeleteComment)

  const OpCustomJson = `CREATE OR REPLACE VIEW hafsql.op_custom_json
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) -> 'required_auths' AS "required_auths",
    (o.body_binary::jsonb -> 'value'::text) -> 'required_posting_auths' AS "required_posting_auths",
    (o.body_binary::jsonb -> 'value'::text) ->> 'id'::text AS "id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json'::text AS "json"
    FROM hive.operations o
    WHERE o.op_type_id = 18;`
  await pool.query(OpCustomJson)

  const OpCommentOptions = `CREATE OR REPLACE VIEW hafsql.op_comment_options
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS "author",
    (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'max_accepted_payout'::text) AS "max_accepted_payout",
    hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'max_accepted_payout'::text) AS "max_accepted_payout_symbol",
    (o.body_binary::jsonb -> 'value'::text) ->> 'percent_hbd'::text AS "percent_hbd",
    (o.body_binary::jsonb -> 'value'::text) ->> 'allow_votes'::text AS "allow_votes",
    (o.body_binary::jsonb -> 'value'::text) ->> 'allow_curation_rewards'::text AS "allow_curation_rewards",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 19;`
  await pool.query(OpCommentOptions)

  const OpSetWithdrawVestingRoute = `CREATE OR REPLACE VIEW hafsql.op_setWithdraw_vesting_route
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from_account'::text AS "from_account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to_account'::text AS "to_account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'percent'::text AS "percent",
    (o.body_binary::jsonb -> 'value'::text) ->> 'auto_vest'::text AS "auto_vest"
    FROM hive.operations o
    WHERE o.op_type_id = 20;`
  await pool.query(OpSetWithdrawVestingRoute)

  const OpLimitOrderCreate2 = `CREATE OR REPLACE VIEW hafsql.op_limit_order_create2
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'orderid'::text AS "orderid",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount_to_sell'::text AS "amount_to_sell",
    (o.body_binary::jsonb -> 'value'::text) ->> 'exchange_rate'::text AS "exchange_rate",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fill_or_kill'::text AS "fill_or_kill",
    (o.body_binary::jsonb -> 'value'::text) ->> 'expiration'::text AS "expiration"
    FROM hive.operations o
    WHERE o.op_type_id = 21;`
  await pool.query(OpLimitOrderCreate2)

  const OpClaimAccount = `CREATE OR REPLACE VIEW hafsql.op_claim_account
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 22;`
  await pool.query(OpClaimAccount)

  const OpCreateClaimedAccount = `CREATE OR REPLACE VIEW hafsql.op_create_claimed_account
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'new_account_name'::text AS "new_account_name",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body_binary::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo_key'::text AS "memo_key",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 23;`
  await pool.query(OpCreateClaimedAccount)

  const OpRequestAccountRecovery = `CREATE OR REPLACE VIEW hafsql.op_request_account_recovery
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'recovery_account'::text AS "recovery_account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account_to_recover'::text AS "account_to_recover",
    (o.body_binary::jsonb -> 'value'::text) ->> 'new_owner_authority'::text AS "new_owner_authority",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 24;`
  await pool.query(OpRequestAccountRecovery)

  const OpRecoverAccount = `CREATE OR REPLACE VIEW hafsql.op_recover_account
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account_to_recover'::text AS "account_to_recover",
    (o.body_binary::jsonb -> 'value'::text) ->> 'new_owner_authority'::text AS "new_owner_authority",
    (o.body_binary::jsonb -> 'value'::text) ->> 'recent_owner_authority'::text AS "recent_owner_authority",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 25;`
  await pool.query(OpRecoverAccount)

  const OpChangeRecoveryAccount = `CREATE OR REPLACE VIEW hafsql.op_change_recovery_account
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account_to_recover'::text AS "account_to_recover",
    (o.body_binary::jsonb -> 'value'::text) ->> 'new_recovery_account'::text AS "new_recovery_account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 26;`
  await pool.query(OpChangeRecoveryAccount)

  const OpEscrowTransfer = `CREATE OR REPLACE VIEW hafsql.op_escrow_transfer
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'hbd_amount'::text AS "hbd_amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'hive_amount'::text AS "hive_amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_meta'::text AS "json_meta",
    (o.body_binary::jsonb -> 'value'::text) ->> 'ratification_deadline'::text AS "ratification_deadline",
    (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_expiration'::text AS "escrow_expiration"
    FROM hive.operations o
    WHERE o.op_type_id = 27;`
  await pool.query(OpEscrowTransfer)

  const OpEscrowDispute = `CREATE OR REPLACE VIEW hafsql.op_escrow_dispute
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body_binary::jsonb -> 'value'::text) ->> 'who'::text AS "who",
    (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id"
    FROM hive.operations o
    WHERE o.op_type_id = 28;`
  await pool.query(OpEscrowDispute)

  const OpEscrowRelease = `CREATE OR REPLACE VIEW hafsql.op_escrow_release
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body_binary::jsonb -> 'value'::text) ->> 'who'::text AS "who",
    (o.body_binary::jsonb -> 'value'::text) ->> 'receiver'::text AS "receiver",
    (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'hbd_amount'::text AS "hbd_amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'hive_amount'::text AS "hive_amount"
    FROM hive.operations o
    WHERE o.op_type_id = 29;`
  await pool.query(OpEscrowRelease)

  const OpPow2 = `CREATE OR REPLACE VIEW hafsql.op_pow2
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'work'::text AS "work",
    (o.body_binary::jsonb -> 'value'::text) ->> 'props'::text AS "props"
    FROM hive.operations o
    WHERE o.op_type_id = 30;`
  await pool.query(OpPow2)

  const OpEscrowApprove = `CREATE OR REPLACE VIEW hafsql.op_escrow_approve
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body_binary::jsonb -> 'value'::text) ->> 'who'::text AS "who",
    (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'approve'::text AS "approve"
    FROM hive.operations o
    WHERE o.op_type_id = 31;`
  await pool.query(OpEscrowApprove)

  const OpTransferToSavings = `CREATE OR REPLACE VIEW hafsql.op_transfer_to_savings
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS "memo"
    FROM hive.operations o
    WHERE o.op_type_id = 32;`
  await pool.query(OpTransferToSavings)

  const OpTransferFromSavings = `CREATE OR REPLACE VIEW hafsql.op_transfer_from_savings
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'request_id'::text AS "request_id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS "memo"
    FROM hive.operations o
    WHERE o.op_type_id = 33;`
  await pool.query(OpTransferFromSavings)

  const OpCancelTransferFromSavings = `CREATE OR REPLACE VIEW hafsql.op_cancel_transfer_from_savings
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'request_id'::text AS "request_id"
    FROM hive.operations o
    WHERE o.op_type_id = 34;`
  await pool.query(OpCancelTransferFromSavings)

  // There is no custom_binary 35 broadcasted - skipping

  const OpDeclineVotingRights = `CREATE OR REPLACE VIEW hafsql.op_decline_voting_rights
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'decline'::text AS "decline"
    FROM hive.operations o
    WHERE o.op_type_id = 36;`
  await pool.query(OpDeclineVotingRights)

  // There is no reset_account 37 broadcasted - skipping
  // There is no set_reset_account 38 broadcasted - skipping

  const OpClaimRewardBalance = `CREATE OR REPLACE VIEW hafsql.op_claim_reward_balance
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'reward_hive'::text AS "reward_hive",
    (o.body_binary::jsonb -> 'value'::text) ->> 'reward_hbd'::text AS "reward_hbd",
    (o.body_binary::jsonb -> 'value'::text) ->> 'reward_vests'::text AS "reward_vests"
    FROM hive.operations o
    WHERE o.op_type_id = 39;`
  await pool.query(OpClaimRewardBalance)

  const OpDelegateVestingShares = `CREATE OR REPLACE VIEW hafsql.op_delegate_vesting_shares
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'delegator'::text AS "delegator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'delegatee'::text AS "delegatee",
    (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS "vesting_shares"
    FROM hive.operations o
    WHERE o.op_type_id = 40;`
  await pool.query(OpDelegateVestingShares)

  const OpAccountCreateWithDelegation = `CREATE OR REPLACE VIEW hafsql.op_account_create_with_delegation
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'new_account_name'::text AS "new_account_name",
    (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body_binary::jsonb -> 'value'::text) ->> 'delegation'::text AS "delegation",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body_binary::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo_key'::text AS "memo_key",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 41;`
  await pool.query(OpAccountCreateWithDelegation)

  const OpWitnessSetProperties = `CREATE OR REPLACE VIEW hafsql.op_witness_set_properties
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'props'::text AS "props",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 42;`
  await pool.query(OpWitnessSetProperties)

  const OpAccountUpdate2 = `CREATE OR REPLACE VIEW hafsql.op_account_update2
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body_binary::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    (o.body_binary::jsonb -> 'value'::text) ->> 'posting_json_metadata'::text AS "posting_json_metadata",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 43;`
  await pool.query(OpAccountUpdate2)

  const OpCreateProposal = `CREATE OR REPLACE VIEW hafsql.op_create_proposal
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'receiver'::text AS "receiver",
    (o.body_binary::jsonb -> 'value'::text) ->> 'subject'::text AS "subject",
    (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    (o.body_binary::jsonb -> 'value'::text) ->> 'start_date'::text AS "start_date",
    (o.body_binary::jsonb -> 'value'::text) ->> 'end_date'::text AS "end_date",
    (o.body_binary::jsonb -> 'value'::text) ->> 'daily_pay'::text AS "daily_pay",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 44;`
  await pool.query(OpCreateProposal)

  const OpUpdateProposalVotes = `CREATE OR REPLACE VIEW hafsql.op_update_proposal_votes
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'voter'::text AS "voter",
    (o.body_binary::jsonb -> 'value'::text) -> 'proposal_ids' AS "proposal_ids",
    (o.body_binary::jsonb -> 'value'::text) ->> 'approve'::text AS "approve",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 45;`
  await pool.query(OpUpdateProposalVotes)

  const OpRemoveProposal = `CREATE OR REPLACE VIEW hafsql.op_remove_proposal
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'proposal_owner'::text AS "proposal_owner",
    (o.body_binary::jsonb -> 'value'::text) -> 'proposal_ids' AS "proposal_ids",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 46;`
  await pool.query(OpRemoveProposal)

  const OpUpdateProposal = `CREATE OR REPLACE VIEW hafsql.op_update_proposal
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'proposal_id'::text AS "proposal_id",
    (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body_binary::jsonb -> 'value'::text) ->> 'daily_pay'::text AS "daily_pay",
    (o.body_binary::jsonb -> 'value'::text) ->> 'subject'::text AS "subject",
    (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 47;`
  await pool.query(OpUpdateProposal)

  const OpCollateralizedConvert = `CREATE OR REPLACE VIEW hafsql.op_collateralized_convert
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body_binary::jsonb -> 'value'::text) ->> 'requestid'::text AS "requestid",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount"
    FROM hive.operations o
    WHERE o.op_type_id = 48;`
  await pool.query(OpCollateralizedConvert)

  const OpRecurrentTransfer = `CREATE OR REPLACE VIEW hafsql.op_recurrent_transfer
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS "memo",
    (o.body_binary::jsonb -> 'value'::text) ->> 'recurrence'::text AS "recurrence",
    (o.body_binary::jsonb -> 'value'::text) ->> 'executions'::text AS "executions",
    (o.body_binary::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions"
    FROM hive.operations o
    WHERE o.op_type_id = 49;`
  await pool.query(OpRecurrentTransfer)
}

export const removeOperationViews = async () => {
  const dropViews = `DROP VIEW IF EXISTS
    hafsql.op_vote,
    hafsql.op_comment,
    hafsql.op_transfer,
    hafsql.op_transfer_to_vesting,
    hafsql.op_withdraw_vesting,
    hafsql.op_limit_order_create,
    hafsql.op_limit_order_cancel,
    hafsql.op_feed_publish,
    hafsql.op_convert,
    hafsql.op_account_create,
    hafsql.op_account_update,
    hafsql.op_witness_update,
    hafsql.op_account_witness_vote,
    hafsql.op_account_witness_proxy,
    hafsql.op_pow,
    hafsql.op_custom,
    hafsql.op_delete_comment,
    hafsql.op_custom_json,
    hafsql.op_comment_options,
    hafsql.op_setWithdraw_vesting_route,
    hafsql.op_limit_order_create2,
    hafsql.op_claim_account,
    hafsql.op_create_claimed_account,
    hafsql.op_request_account_recovery,
    hafsql.op_recover_account,
    hafsql.op_change_recovery_account,
    hafsql.op_escrow_transfer,
    hafsql.op_escrow_dispute,
    hafsql.op_escrow_release,
    hafsql.op_pow2,
    hafsql.op_escrow_approve,
    hafsql.op_transfer_to_savings,
    hafsql.op_transfer_from_savings,
    hafsql.op_cancel_transfer_from_savings,
    hafsql.op_decline_voting_rights,
    hafsql.op_claim_reward_balance,
    hafsql.op_delegate_vesting_shares,
    hafsql.op_account_create_with_delegation,
    hafsql.op_witness_set_properties,
    hafsql.op_account_update2,
    hafsql.op_create_proposal,
    hafsql.op_update_proposal_votes,
    hafsql.op_remove_proposal,
    hafsql.op_update_proposal,
    hafsql.op_collateralized_convert,
    hafsql.op_recurrent_transfer;`
  await pool.query(dropViews)
}

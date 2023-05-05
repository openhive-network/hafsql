import { pool } from '../helpers/database.js'

export const setupOperationViews = async () => {
  const TxVote = `CREATE OR REPLACE VIEW hafsql.TxVote
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'voter'::text AS voter,
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'weight'::text AS weight,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
          FROM hive.transactions t
        WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 0;`
  await pool.query(TxVote)

  const TxComment = `CREATE OR REPLACE VIEW hafsql.TxComment
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
    (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
    (o.body::jsonb -> 'value'::text) ->> 'parent_author'::text AS parent_author,
    (o.body::jsonb -> 'value'::text) ->> 'parent_permlink'::text AS parent_permlink,
    (o.body::jsonb -> 'value'::text) ->> 'title'::text AS title,
    (o.body::jsonb -> 'value'::text) ->> 'body'::text AS body,
    (o.body::jsonb -> 'value'::text) ->> 'json_metadata'::text AS json_metadata,
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 1;`
  await pool.query(TxComment)

  const TxTransfer = `CREATE OR REPLACE VIEW hafsql.TxTransfer
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS amount,
    (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 2;`
  await pool.query(TxTransfer)
  
  const TxTransferToVesting = `CREATE OR REPLACE VIEW hafsql.TxTransferToVesting
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS amount,
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 3;`
  await pool.query(TxTransferToVesting)

  const TxWithdrawVesting = `CREATE OR REPLACE VIEW hafsql.TxWithdrawVesting
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS "vesting_shares",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 4;`
  await pool.query(TxWithdrawVesting)

  const TxLimitOrderCreate = `CREATE OR REPLACE VIEW hafsql.TxLimitOrderCreate
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'orderid'::text AS "orderid",
    (o.body::jsonb -> 'value'::text) ->> 'amount_to_sell'::text AS amount_to_sell,
    (o.body::jsonb -> 'value'::text) ->> 'min_to_receive'::text AS min_to_receive,
    (o.body::jsonb -> 'value'::text) ->> 'fill_or_kill'::text AS fill_or_kill,
    (o.body::jsonb -> 'value'::text) ->> 'expiration'::text AS expiration,
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 5;`
  await pool.query(TxLimitOrderCreate)

  const TxLimitOrderCancel = `CREATE OR REPLACE VIEW hafsql.TxLimitOrderCancel
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'orderid'::text AS "orderid",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 6;`
  await pool.query(TxLimitOrderCancel)

  const TxFeedPublish = `CREATE OR REPLACE VIEW hafsql.TxFeedPublish
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'publisher'::text AS "publisher",
    (o.body::jsonb -> 'value'::text) ->> 'exchange_rate'::text AS "exchange_rate",
    (o.body::jsonb -> 'value'::text) ->> 'quote'::text AS "quote",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 7;`
  await pool.query(TxFeedPublish)

  const TxConvert = `CREATE OR REPLACE VIEW hafsql.TxConvert
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'requestid'::text AS "requestid",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 8;`
  await pool.query(TxConvert)

  const TxAccountCreate = `CREATE OR REPLACE VIEW hafsql.TxAccountCreate
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body::jsonb -> 'value'::text) ->> 'new_account_name'::text AS "new_account_name",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body::jsonb -> 'value'::text) ->> 'memo_key'::text AS "active",
    (o.body::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 9;`
  await pool.query(TxAccountCreate)

  const TxAccountUpdate = `CREATE OR REPLACE VIEW hafsql.TxAccountUpdate
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body::jsonb -> 'value'::text) ->> 'memo_key'::text AS "active",
    (o.body::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 10;`
  await pool.query(TxAccountUpdate)

  const TxWitnessUpdate = `CREATE OR REPLACE VIEW hafsql.TxWitnessUpdate
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'url'::text AS "url",
    (o.body::jsonb -> 'value'::text) ->> 'block_signing_key'::text AS "block_signing_key",
    (o.body::jsonb -> 'value'::text) ->> 'props'::text AS "posting",
    (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 11;`
  await pool.query(TxWitnessUpdate)

  const TxAccountWitnessVote = `CREATE OR REPLACE VIEW hafsql.TxAccountWitnessVote
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'witness'::text AS "witness",
    (o.body::jsonb -> 'value'::text) ->> 'approve'::text AS "approve",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 12;`
  await pool.query(TxAccountWitnessVote)

  const TxAccountWitnessProxy = `CREATE OR REPLACE VIEW hafsql.TxAccountWitnessProxy
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'proxy'::text AS "proxy",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 13;`
  await pool.query(TxAccountWitnessProxy)

  const TxPow = `CREATE OR REPLACE VIEW hafsql.TxPow
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'worker_account'::text AS "worker_account",
    (o.body::jsonb -> 'value'::text) ->> 'block_id'::text AS "block_id",
    (o.body::jsonb -> 'value'::text) ->> 'nonce'::text AS "nonce",
    (o.body::jsonb -> 'value'::text) ->> 'work'::text AS "work",
    (o.body::jsonb -> 'value'::text) ->> 'props'::text AS "props",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 14;`
  await pool.query(TxPow)

  const TxCustom = `CREATE OR REPLACE VIEW hafsql.TxCustom
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) -> 'required_auths' AS "required_auths",
    (o.body::jsonb -> 'value'::text) ->> 'id'::text AS "id",
    (o.body::jsonb -> 'value'::text) ->> 'data'::text AS "data",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 15;`
  await pool.query(TxCustom)

  // skipping op_type_id: 16 - witness_block_approve has never been broadcasted apprantly

  const TxDeleteComment = `CREATE OR REPLACE VIEW hafsql.TxDeleteComment
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'author'::text AS "author",
    (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 17;`
  await pool.query(TxDeleteComment)

  const TxCustomJson = `CREATE OR REPLACE VIEW hafsql.TxCustomJson
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) -> 'required_auths' AS "required_auths",
    (o.body::jsonb -> 'value'::text) -> 'required_posting_auths' AS "required_posting_auths",
    (o.body::jsonb -> 'value'::text) ->> 'id'::text AS "id",
    (o.body::jsonb -> 'value'::text) ->> 'json'::text AS "json",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 18;`
  await pool.query(TxCustomJson)

  const TxCommentOptions = `CREATE OR REPLACE VIEW hafsql.TxCommentOptions
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'author'::text AS "author",
    (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    (o.body::jsonb -> 'value'::text) ->> 'max_accepted_payout'::text AS "max_accepted_payout",
    (o.body::jsonb -> 'value'::text) ->> 'percent_hbd'::text AS "percent_hbd",
    (o.body::jsonb -> 'value'::text) ->> 'allow_votes'::text AS "allow_votes",
    (o.body::jsonb -> 'value'::text) ->> 'allow_curation_rewards'::text AS "allow_curation_rewards",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 19;`
  await pool.query(TxCommentOptions)

  const TxSetWithdrawVestingRoute = `CREATE OR REPLACE VIEW hafsql.TxSetWithdrawVestingRoute
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from_account'::text AS "from_account",
    (o.body::jsonb -> 'value'::text) ->> 'to_account'::text AS "to_account",
    (o.body::jsonb -> 'value'::text) ->> 'percent'::text AS "percent",
    (o.body::jsonb -> 'value'::text) ->> 'auto_vest'::text AS "auto_vest",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 20;`
  await pool.query(TxSetWithdrawVestingRoute)

  const TxLimitOrderCreate2 = `CREATE OR REPLACE VIEW hafsql.TxLimitOrderCreate2
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'orderid'::text AS "orderid",
    (o.body::jsonb -> 'value'::text) ->> 'amount_to_sell'::text AS "amount_to_sell",
    (o.body::jsonb -> 'value'::text) ->> 'exchange_rate'::text AS "exchange_rate",
    (o.body::jsonb -> 'value'::text) ->> 'fill_or_kill'::text AS "fill_or_kill",
    (o.body::jsonb -> 'value'::text) ->> 'expiration'::text AS "expiration",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 21;`
  await pool.query(TxLimitOrderCreate2)

  const TxClaimAccount = `CREATE OR REPLACE VIEW hafsql.TxClaimAccount
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 22;`
  await pool.query(TxClaimAccount)

  const TxCreateClaimedAccount = `CREATE OR REPLACE VIEW hafsql.TxCreateClaimedAccount
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body::jsonb -> 'value'::text) ->> 'new_account_name'::text AS "new_account_name",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body::jsonb -> 'value'::text) ->> 'memo_key'::text AS "memo_key",
    (o.body::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 23;`
  await pool.query(TxCreateClaimedAccount)

  const TxRequestAccountRecovery = `CREATE OR REPLACE VIEW hafsql.TxRequestAccountRecovery
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'recovery_account'::text AS "recovery_account",
    (o.body::jsonb -> 'value'::text) ->> 'account_to_recover'::text AS "account_to_recover",
    (o.body::jsonb -> 'value'::text) ->> 'new_owner_authority'::text AS "new_owner_authority",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 24;`
  await pool.query(TxRequestAccountRecovery)

  const TxRecoverAccount = `CREATE OR REPLACE VIEW hafsql.TxRecoverAccount
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account_to_recover'::text AS "account_to_recover",
    (o.body::jsonb -> 'value'::text) ->> 'new_owner_authority'::text AS "new_owner_authority",
    (o.body::jsonb -> 'value'::text) ->> 'recent_owner_authority'::text AS "recent_owner_authority",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 25;`
  await pool.query(TxRecoverAccount)

  const TxChangeRecoveryAccount = `CREATE OR REPLACE VIEW hafsql.TxChangeRecoveryAccount
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account_to_recover'::text AS "account_to_recover",
    (o.body::jsonb -> 'value'::text) ->> 'new_recovery_account'::text AS "new_recovery_account",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 26;`
  await pool.query(TxChangeRecoveryAccount)

  const TxEscrowTransfer = `CREATE OR REPLACE VIEW hafsql.TxEscrowTransfer
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'hbd_amount'::text AS "hbd_amount",
    (o.body::jsonb -> 'value'::text) ->> 'hive_amount'::text AS "hive_amount",
    (o.body::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    (o.body::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body::jsonb -> 'value'::text) ->> 'json_meta'::text AS "json_meta",
    (o.body::jsonb -> 'value'::text) ->> 'ratification_deadline'::text AS "ratification_deadline",
    (o.body::jsonb -> 'value'::text) ->> 'escrow_expiration'::text AS "escrow_expiration",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 27;`
  await pool.query(TxEscrowTransfer)

  const TxEscrowDispute = `CREATE OR REPLACE VIEW hafsql.TxEscrowDispute
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body::jsonb -> 'value'::text) ->> 'who'::text AS "who",
    (o.body::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 28;`
  await pool.query(TxEscrowDispute)

  const TxEscrowRelease = `CREATE OR REPLACE VIEW hafsql.TxEscrowRelease
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body::jsonb -> 'value'::text) ->> 'who'::text AS "who",
    (o.body::jsonb -> 'value'::text) ->> 'receiver'::text AS "receiver",
    (o.body::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    (o.body::jsonb -> 'value'::text) ->> 'hbd_amount'::text AS "hbd_amount",
    (o.body::jsonb -> 'value'::text) ->> 'hive_amount'::text AS "hive_amount",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 29;`
  await pool.query(TxEscrowRelease)

  const TxPow2 = `CREATE OR REPLACE VIEW hafsql.TxPow2
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'work'::text AS "work",
    (o.body::jsonb -> 'value'::text) ->> 'props'::text AS "props",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 30;`
  await pool.query(TxPow2)

  const TxEscrowApprove = `CREATE OR REPLACE VIEW hafsql.TxEscrowApprove
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'agent'::text AS "agent",
    (o.body::jsonb -> 'value'::text) ->> 'who'::text AS "who",
    (o.body::jsonb -> 'value'::text) ->> 'escrow_id'::text AS "escrow_id",
    (o.body::jsonb -> 'value'::text) ->> 'approve'::text AS "approve",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 31;`
  await pool.query(TxEscrowApprove)

  const TxTransferToSavings = `CREATE OR REPLACE VIEW hafsql.TxTransferToSavings
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS "memo",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 32;`
  await pool.query(TxTransferToSavings)

  const TxTransferFromSavings = `CREATE OR REPLACE VIEW hafsql.TxTransferFromSavings
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'request_id'::text AS "request_id",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS "memo",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 33;`
  await pool.query(TxTransferFromSavings)

  const TxCancelTransferFromSavings = `CREATE OR REPLACE VIEW hafsql.TxCancelTransferFromSavings
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'request_id'::text AS "request_id",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 34;`
  await pool.query(TxCancelTransferFromSavings)

  // There is no custom_binary 35 broadcasted - skipping

  const TxDeclineVotingRights = `CREATE OR REPLACE VIEW hafsql.TxDeclineVotingRights
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'decline'::text AS "decline",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 36;`
  await pool.query(TxDeclineVotingRights)

  // There is no reset_account 37 broadcasted - skipping
  // There is no set_reset_account 38 broadcasted - skipping

  const TxClaimRewardBalance = `CREATE OR REPLACE VIEW hafsql.TxClaimRewardBalance
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'reward_hive'::text AS "reward_hive",
    (o.body::jsonb -> 'value'::text) ->> 'reward_hbd'::text AS "reward_hbd",
    (o.body::jsonb -> 'value'::text) ->> 'reward_vests'::text AS "reward_vests",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 39;`
  await pool.query(TxClaimRewardBalance)

  const TxDelegateVestingShares = `CREATE OR REPLACE VIEW hafsql.TxDelegateVestingShares
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'delegator'::text AS "delegator",
    (o.body::jsonb -> 'value'::text) ->> 'delegatee'::text AS "delegatee",
    (o.body::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS "vesting_shares",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 40;`
  await pool.query(TxDelegateVestingShares)

  const TxAccountCreateWithDelegation = `CREATE OR REPLACE VIEW hafsql.TxAccountCreateWithDelegation
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body::jsonb -> 'value'::text) ->> 'new_account_name'::text AS "new_account_name",
    (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS "fee",
    (o.body::jsonb -> 'value'::text) ->> 'delegation'::text AS "delegation",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'active'::text AS "active",
    (o.body::jsonb -> 'value'::text) ->> 'posting'::text AS "posting",
    (o.body::jsonb -> 'value'::text) ->> 'memo_key'::text AS "memo_key",
    (o.body::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 41;`
  await pool.query(TxAccountCreateWithDelegation)

  const TxWitnessSetProperties = `CREATE OR REPLACE VIEW hafsql.TxWitnessSetProperties
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'props'::text AS "props",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 42;`
  await pool.query(TxWitnessSetProperties)

  const TxAccountUpdate2 = `CREATE OR REPLACE VIEW hafsql.TxAccountUpdate2
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'account'::text AS "account",
    (o.body::jsonb -> 'value'::text) ->> 'json_metadata'::text AS "json_metadata",
    (o.body::jsonb -> 'value'::text) ->> 'posting_json_metadata'::text AS "posting_json_metadata",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 43;`
  await pool.query(TxAccountUpdate2)

  const TxCreateProposal = `CREATE OR REPLACE VIEW hafsql.TxCreateProposal
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body::jsonb -> 'value'::text) ->> 'receiver'::text AS "receiver",
    (o.body::jsonb -> 'value'::text) ->> 'subject'::text AS "subject",
    (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    (o.body::jsonb -> 'value'::text) ->> 'start_date'::text AS "start_date",
    (o.body::jsonb -> 'value'::text) ->> 'end_date'::text AS "end_date",
    (o.body::jsonb -> 'value'::text) ->> 'daily_pay'::text AS "daily_pay",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 44;`
  await pool.query(TxCreateProposal)

  const TxUpdateProposalVotes = `CREATE OR REPLACE VIEW hafsql.TxUpdateProposalVotes
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'voter'::text AS "voter",
    (o.body::jsonb -> 'value'::text) -> 'proposal_ids' AS "proposal_ids",
    (o.body::jsonb -> 'value'::text) ->> 'approve'::text AS "approve",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 45;`
  await pool.query(TxUpdateProposalVotes)

  const TxRemoveProposal = `CREATE OR REPLACE VIEW hafsql.TxRemoveProposal
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'proposal_owner'::text AS "proposal_owner",
    (o.body::jsonb -> 'value'::text) -> 'proposal_ids' AS "proposal_ids",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 46;`
  await pool.query(TxRemoveProposal)

  const TxUpdateProposal = `CREATE OR REPLACE VIEW hafsql.TxUpdateProposal
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'proposal_id'::text AS "proposal_id",
    (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS "creator",
    (o.body::jsonb -> 'value'::text) ->> 'daily_pay'::text AS "daily_pay",
    (o.body::jsonb -> 'value'::text) ->> 'subject'::text AS "subject",
    (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS "permlink",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 47;`
  await pool.query(TxUpdateProposal)

  const TxCollateralizedConvert = `CREATE OR REPLACE VIEW hafsql.TxCollateralizedConvert
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS "owner",
    (o.body::jsonb -> 'value'::text) ->> 'requestid'::text AS "requestid",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 48;`
  await pool.query(TxCollateralizedConvert)

  const TxRecurrentTransfer = `CREATE OR REPLACE VIEW hafsql.TxRecurrentTransfer
  AS SELECT o.id AS op_id,
    o."timestamp",
    (o.body::jsonb -> 'value'::text) ->> 'from'::text AS "from",
    (o.body::jsonb -> 'value'::text) ->> 'to'::text AS "to",
    (o.body::jsonb -> 'value'::text) ->> 'amount'::text AS "amount",
    (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS "memo",
    (o.body::jsonb -> 'value'::text) ->> 'recurrence'::text AS "recurrence",
    (o.body::jsonb -> 'value'::text) ->> 'executions'::text AS "executions",
    (o.body::jsonb -> 'value'::text) ->> 'extensions'::text AS "extensions",
    ( SELECT encode(t.trx_hash, 'hex'::text) AS trx_hash
        FROM hive.transactions t
      WHERE t.block_num = o.block_num AND t.trx_in_block = o.trx_in_block) AS trx_id
    FROM hive.operations o
    WHERE o.op_type_id = 49;`
  await pool.query(TxRecurrentTransfer)
}

export const removeOperationViews = async () => {
  const dropViews = `DROP VIEW IF EXISTS
    hafsql.TxVote,
    hafsql.TxComment,
    hafsql.TxTransfer,
    hafsql.TxTransferToVesting,
    hafsql.TxWithdrawVesting,
    hafsql.TxLimitOrderCreate,
    hafsql.TxLimitOrderCancel,
    hafsql.TxFeedPublish,
    hafsql.TxConvert,
    hafsql.TxAccountCreate,
    hafsql.TxAccountUpdate,
    hafsql.TxWitnessUpdate,
    hafsql.TxAccountWitnessVote,
    hafsql.TxAccountWitnessProxy,
    hafsql.TxPow,
    hafsql.TxCustom,
    hafsql.TxDeleteComment,
    hafsql.TxCustomJson,
    hafsql.TxCommentOptions,
    hafsql.TxSetWithdrawVestingRoute,
    hafsql.TxLimitOrderCreate2,
    hafsql.TxClaimAccount,
    hafsql.TxCreateClaimedAccount,
    hafsql.TxRequestAccountRecovery,
    hafsql.TxRecoverAccount,
    hafsql.TxChangeRecoveryAccount,
    hafsql.TxEscrowTransfer,
    hafsql.TxEscrowDispute,
    hafsql.TxEscrowRelease,
    hafsql.TxPow2,
    hafsql.TxEscrowApprove,
    hafsql.TxTransferToSavings,
    hafsql.TxTransferFromSavings,
    hafsql.TxCancelTransferFromSavings,
    hafsql.TxDeclineVotingRights,
    hafsql.TxClaimRewardBalance,
    hafsql.TxDelegateVestingShares,
    hafsql.TxAccountCreateWithDelegation,
    hafsql.TxWitnessSetProperties,
    hafsql.TxAccountUpdate2,
    hafsql.TxCreateProposal,
    hafsql.TxUpdateProposalVotes,
    hafsql.TxRemoveProposal,
    hafsql.TxUpdateProposal,
    hafsql.TxCollateralizedConvert,
    hafsql.TxRecurrentTransfer;`
  await pool.query(dropViews)
}

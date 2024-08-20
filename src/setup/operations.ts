import { pool } from '../helpers/database.ts'

/**
 * Return the jsonb cast of the parameter from the operation body
 */
const param = (param: string, jsonb = false) => {
  if (jsonb) {
    return `(o.body_binary::jsonb->'value'->'${param}')`
  }
  return `(o.body_binary::jsonb->'value'->>'${param}')`
}
const amount = (param: string) => {
  return `hafsql.asset_amount(${param})`
}
const symbol = (param: string) => {
  return `hafsql.asset_symbol(${param})`
}
const to_json = (param: string) => {
  return `hafsql.to_json(${param})`
}
// vests to hive
const v2h = (param: string, block = '') => {
  if (block !== '') {
    return `hafsql.vests_to_hive(${param}, ${block})`
  }
  return `hafsql.vests_to_hive(${param})`
}
const block = (id: string) => {
  return `hive.operation_id_to_block_num(${id})`
}

export const setupOperationViews = async () => {
  using client = await pool.connect()
  const OpVote = `CREATE OR REPLACE VIEW hafsql.op_vote
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('voter')} AS "voter",
      ${param('author')} AS "author",
      ${param('weight')} AS "weight",
      ${param('permlink')} AS "permlink",
      ${block('o.id')} AS "block_num",
      hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 0;`
  await client.queryObject(OpVote)

  const OpComment = `CREATE OR REPLACE VIEW hafsql.op_comment
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('author')} AS "author",
    ${param('permlink')} AS "permlink",
    ${param('parent_author')}::text AS "parent_author",
    ${param('parent_permlink')} AS "parent_permlink",
    ${param('title')} AS "title",
    ${param('body')} AS "body",
    ${param('json_metadata')} AS "json_metadata",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 1;`
  await client.queryObject(OpComment)

  const OpTransfer = `CREATE OR REPLACE VIEW hafsql.op_transfer
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${param('memo')} AS "memo",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 2;`
  await client.queryObject(OpTransfer)

  const OpTransferToVesting =
    `CREATE OR REPLACE VIEW hafsql.op_transfer_to_vesting
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 3;`
  await client.queryObject(OpTransferToVesting)

  const OpWithdrawVesting = `CREATE OR REPLACE VIEW hafsql.op_withdraw_vesting
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${amount(param('vesting_shares'))} AS "vesting_shares",
    ${symbol(param('vesting_shares'))} AS "symbol",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 4;`
  await client.queryObject(OpWithdrawVesting)

  const OpLimitOrderCreate =
    `CREATE OR REPLACE VIEW hafsql.op_limit_order_create
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('orderid')} AS "orderid",
    ${amount(param('amount_to_sell'))} AS "amount_to_sell",
    ${symbol(param('amount_to_sell'))} AS "amount_to_sell_symbol",
    ${amount(param('min_to_receive'))} AS "min_to_receive",
    ${symbol(param('min_to_receive'))} AS "min_to_receive_symbol",
    ${param('fill_or_kill')} AS "fill_or_kill",
    ${param('expiration')} AS "expiration",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 5;`
  await client.queryObject(OpLimitOrderCreate)

  const OpLimitOrderCancel =
    `CREATE OR REPLACE VIEW hafsql.op_limit_order_cancel
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('orderid')} AS "orderid",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 6;`
  await client.queryObject(OpLimitOrderCancel)

  // deno-fmt-ignore
  const OpFeedPublish = `CREATE OR REPLACE VIEW hafsql.op_feed_publish
    AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('publisher')} AS "publisher",
    ${param('exchange_rate')} AS "exchange_rate",
    ${amount(to_json(param('exchange_rate')) + "->>'base'")} AS "exchange_rate_base",
    ${amount(to_json(param('exchange_rate')) + "->>'quote'")} AS "exchange_rate_quote",
    ${param('quote')} AS "quote",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 7;`
  await client.queryObject(OpFeedPublish)

  const OpConvert = `CREATE OR REPLACE VIEW hafsql.op_convert
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('requestid')} AS "requestid",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 8;`
  await client.queryObject(OpConvert)

  const OpAccountCreate = `CREATE OR REPLACE VIEW hafsql.op_account_create
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${amount(param('fee'))} AS "fee",
    ${symbol(param('fee'))} AS "fee_symbol",
    ${param('creator')} AS "creator",
    ${param('new_account_name')} AS "new_account_name",
    ${param('owner')} AS "owner",
    ${param('active')} AS "active",
    ${param('posting')} AS "posting",
    ${param('memo_key')} AS "memo_key",
    ${param('json_metadata')} AS "json_metadata",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 9;`
  await client.queryObject(OpAccountCreate)

  const OpAccountUpdate = `CREATE OR REPLACE VIEW hafsql.op_account_update
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${param('owner')} AS "owner",
    ${param('active')} AS "active",
    ${param('posting')} AS "posting",
    ${param('memo_key')} AS "memo_key",
    ${param('json_metadata')} AS "json_metadata",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 10;`
  await client.queryObject(OpAccountUpdate)

  // could expand props
  const OpWitnessUpdate = `CREATE OR REPLACE VIEW hafsql.op_witness_update
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('url')} AS "url",
    ${param('block_signing_key')} AS "block_signing_key",
    ${param('props')} AS "props",
    ${param('fee')} AS "fee",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 11;`
  await client.queryObject(OpWitnessUpdate)

  const OpAccountWitnessVote =
    `CREATE OR REPLACE VIEW hafsql.op_account_witness_vote
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${param('witness')} AS "witness",
    ${param('approve')} AS "approve",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 12;`
  await client.queryObject(OpAccountWitnessVote)

  const OpAccountWitnessProxy =
    `CREATE OR REPLACE VIEW hafsql.op_account_witness_proxy
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${param('proxy')} AS "proxy",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 13;`
  await client.queryObject(OpAccountWitnessProxy)

  const OpPow = `CREATE OR REPLACE VIEW hafsql.op_pow
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('worker_account')} AS "worker_account",
    ${param('block_id')} AS "block_id",
    ${param('nonce')} AS "nonce",
    ${param('work')} AS "work",
    ${param('props')} AS "props",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 14;`
  await client.queryObject(OpPow)

  const OpCustom = `CREATE OR REPLACE VIEW hafsql.op_custom
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('required_auths', true)} AS "required_auths",
    ${param('id')} AS "id",
    ${param('data')} AS "data",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 15;`
  await client.queryObject(OpCustom)

  // skipping op_type_id: 16 - witness_block_approve has never been broadcasted apprantly

  const OpDeleteComment = `CREATE OR REPLACE VIEW hafsql.op_delete_comment
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('author')} AS "author",
    ${param('permlink')} AS "permlink",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 17;`
  await client.queryObject(OpDeleteComment)

  const OpCustomJson = `CREATE OR REPLACE VIEW hafsql.op_custom_json
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('required_auths', true)} AS "required_auths",
    ${param('required_posting_auths', true)} AS "required_posting_auths",
    ${param('id')} AS "id",
    ${param('json')} AS "json",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 18;`
  await client.queryObject(OpCustomJson)

  const OpCommentOptions = `CREATE OR REPLACE VIEW hafsql.op_comment_options
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('author')} AS "author",
    ${param('permlink')} AS "permlink",
    ${amount(param('max_accepted_payout'))} AS "max_accepted_payout",
    ${symbol(param('max_accepted_payout'))} AS "max_accepted_payout_symbol",
    ${param('percent_hbd')} AS "percent_hbd",
    ${param('allow_votes')} AS "allow_votes",
    ${param('allow_curation_rewards')} AS "allow_curation_rewards",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 19;`
  await client.queryObject(OpCommentOptions)

  const OpSetWithdrawVestingRoute =
    `CREATE OR REPLACE VIEW hafsql.op_setWithdraw_vesting_route
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from_account')} AS "from_account",
    ${param('to_account')} AS "to_account",
    ${param('percent')} AS "percent",
    ${param('auto_vest')} AS "auto_vest",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 20;`
  await client.queryObject(OpSetWithdrawVestingRoute)

  const OpLimitOrderCreate2 =
    `CREATE OR REPLACE VIEW hafsql.op_limit_order_create2
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('orderid')} AS "orderid",
    ${amount(param('amount_to_sell'))} AS "amount_to_sell",
    ${symbol(param('amount_to_sell'))} AS "amount_to_sell_symbol",
    ${amount(param('exchange_rate'))} AS "exchange_rate",
    ${symbol(param('exchange_rate'))} AS "exchange_rate_symbol",
    ${param('fill_or_kill')} AS "fill_or_kill",
    ${param('expiration')} AS "expiration",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 21;`
  await client.queryObject(OpLimitOrderCreate2)

  const OpClaimAccount = `CREATE OR REPLACE VIEW hafsql.op_claim_account
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('creator')} AS "creator",
    ${amount(param('fee'))} AS "fee",
    ${symbol(param('fee'))} AS "symbol",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 22;`
  await client.queryObject(OpClaimAccount)

  const OpCreateClaimedAccount =
    `CREATE OR REPLACE VIEW hafsql.op_create_claimed_account
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('creator')} AS "creator",
    ${param('new_account_name')} AS "new_account_name",
    ${param('owner')} AS "owner",
    ${param('active')} AS "active",
    ${param('posting')} AS "posting",
    ${param('memo_key')} AS "memo_key",
    ${param('json_metadata')} AS "json_metadata",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 23;`
  await client.queryObject(OpCreateClaimedAccount)

  const OpRequestAccountRecovery =
    `CREATE OR REPLACE VIEW hafsql.op_request_account_recovery
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('recovery_account')} AS "recovery_account",
    ${param('account_to_recover')} AS "account_to_recover",
    ${param('new_owner_authority')} AS "new_owner_authority",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 24;`
  await client.queryObject(OpRequestAccountRecovery)

  const OpRecoverAccount = `CREATE OR REPLACE VIEW hafsql.op_recover_account
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account_to_recover')} AS "account_to_recover",
    ${param('new_owner_authority')} AS "new_owner_authority",
    ${param('recent_owner_authority')} AS "recent_owner_authority",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 25;`
  await client.queryObject(OpRecoverAccount)

  const OpChangeRecoveryAccount =
    `CREATE OR REPLACE VIEW hafsql.op_change_recovery_account
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account_to_recover')} AS "account_to_recover",
    ${param('new_recovery_account')} AS "new_recovery_account",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 26;`
  await client.queryObject(OpChangeRecoveryAccount)

  const OpEscrowTransfer = `CREATE OR REPLACE VIEW hafsql.op_escrow_transfer
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${amount(param('hbd_amount'))} AS "hbd_amount",
    ${amount(param('hive_amount'))} AS "hive_amount",
    ${param('escrow_id')} AS "escrow_id",
    ${param('agent')} AS "agent",
    ${amount(param('fee'))} AS "fee",
    ${symbol(param('fee'))} AS "fee_symbol",
    ${param('json_meta')} AS "json_meta",
    ${param('ratification_deadline')} AS "ratification_deadline",
    ${param('escrow_expiration')} AS "escrow_expiration",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 27;`
  await client.queryObject(OpEscrowTransfer)

  const OpEscrowDispute = `CREATE OR REPLACE VIEW hafsql.op_escrow_dispute
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${param('agent')} AS "agent",
    ${param('who')} AS "who",
    ${param('escrow_id')} AS "escrow_id",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 28;`
  await client.queryObject(OpEscrowDispute)

  const OpEscrowRelease = `CREATE OR REPLACE VIEW hafsql.op_escrow_release
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${param('agent')} AS "agent",
    ${param('who')} AS "who",
    ${param('receiver')} AS "receiver",
    ${param('escrow_id')} AS "escrow_id",
    ${amount(param('hbd_amount'))} AS "hbd_amount",
    ${amount(param('hive_amount'))} AS "hive_amount",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 29;`
  await client.queryObject(OpEscrowRelease)

  const OpPow2 = `CREATE OR REPLACE VIEW hafsql.op_pow2
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('work')} AS "work",
    ${param('props')} AS "props",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 30;`
  await client.queryObject(OpPow2)

  const OpEscrowApprove = `CREATE OR REPLACE VIEW hafsql.op_escrow_approve
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${param('agent')} AS "agent",
    ${param('who')} AS "who",
    ${param('escrow_id')} AS "escrow_id",
    ${param('approve')} AS "approve",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 31;`
  await client.queryObject(OpEscrowApprove)

  const OpTransferToSavings =
    `CREATE OR REPLACE VIEW hafsql.op_transfer_to_savings
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${param('memo')} AS "memo",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 32;`
  await client.queryObject(OpTransferToSavings)

  const OpTransferFromSavings =
    `CREATE OR REPLACE VIEW hafsql.op_transfer_from_savings
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('request_id')} AS "request_id",
    ${param('to')} AS "to",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${param('memo')} AS "memo",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 33;`
  await client.queryObject(OpTransferFromSavings)

  const OpCancelTransferFromSavings =
    `CREATE OR REPLACE VIEW hafsql.op_cancel_transfer_from_savings
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('request_id')} AS "request_id",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 34;`
  await client.queryObject(OpCancelTransferFromSavings)

  // There is no custom_binary 35 broadcasted - skipping

  const OpDeclineVotingRights =
    `CREATE OR REPLACE VIEW hafsql.op_decline_voting_rights
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${param('decline')} AS "decline",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 36;`
  await client.queryObject(OpDeclineVotingRights)

  // There is no reset_account 37 broadcasted - skipping
  // There is no set_reset_account 38 broadcasted - skipping

  const OpClaimRewardBalance =
    `CREATE OR REPLACE VIEW hafsql.op_claim_reward_balance
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${amount(param('reward_hive'))} AS "reward_hive",
    ${amount(param('reward_hbd'))} AS "reward_hbd",
    ${amount(param('reward_vests'))} AS "reward_vests",
    ${v2h(amount(param('reward_vests')))} AS "vests_hp",
    ${
      v2h(amount(param('reward_vests')), block('o.id'))
    } AS "vests_historical_hp",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 39;`
  await client.queryObject(OpClaimRewardBalance)

  const OpDelegateVestingShares =
    `CREATE OR REPLACE VIEW hafsql.op_delegate_vesting_shares
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('delegator')} AS "delegator",
    ${param('delegatee')} AS "delegatee",
    ${amount(param('vesting_shares'))} AS "vesting_shares",
    ${v2h(amount(param('vesting_shares')))} AS "vests_hp",
    ${
      v2h(amount(param('vesting_shares')), block('o.id'))
    } AS "vests_historical_hp",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 40;`
  await client.queryObject(OpDelegateVestingShares)

  const OpAccountCreateWithDelegation =
    `CREATE OR REPLACE VIEW hafsql.op_account_create_with_delegation
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('creator')} AS "creator",
    ${param('new_account_name')} AS "new_account_name",
    ${amount(param('fee'))} AS "fee",
    ${symbol(param('fee'))} AS "fee_symbol",
    ${amount(param('delegation'))} AS "delegation_vests",
    ${v2h(amount(param('delegation')))} AS "vests_hp",
    ${v2h(amount(param('delegation')), block('o.id'))} AS "vests_historical_hp",
    ${param('owner')} AS "owner",
    ${param('active')} AS "active",
    ${param('posting')} AS "posting",
    ${param('memo_key')} AS "memo_key",
    ${param('json_metadata')} AS "json_metadata",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 41;`
  await client.queryObject(OpAccountCreateWithDelegation)

  const OpWitnessSetProperties =
    `CREATE OR REPLACE VIEW hafsql.op_witness_set_properties
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('props')} AS "props",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 42;`
  await client.queryObject(OpWitnessSetProperties)

  const OpAccountUpdate2 = `CREATE OR REPLACE VIEW hafsql.op_account_update2
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('account')} AS "account",
    ${param('json_metadata')} AS "json_metadata",
    ${param('posting_json_metadata')} AS "posting_json_metadata",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 43;`
  await client.queryObject(OpAccountUpdate2)

  const OpCreateProposal = `CREATE OR REPLACE VIEW hafsql.op_create_proposal
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('creator')} AS "creator",
    ${param('receiver')} AS "receiver",
    ${param('subject')} AS "subject",
    ${param('permlink')} AS "permlink",
    ${param('start_date')} AS "start_date",
    ${param('end_date')} AS "end_date",
    ${amount(param('daily_pay'))} AS "daily_pay",
    ${symbol(param('daily_pay'))} AS "daily_pay_symbol",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 44;`
  await client.queryObject(OpCreateProposal)

  const OpUpdateProposalVotes =
    `CREATE OR REPLACE VIEW hafsql.op_update_proposal_votes
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('voter')} AS "voter",
    ${param('proposal_ids', true)} AS "proposal_ids",
    ${param('approve')} AS "approve",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 45;`
  await client.queryObject(OpUpdateProposalVotes)

  const OpRemoveProposal = `CREATE OR REPLACE VIEW hafsql.op_remove_proposal
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('proposal_owner')} AS "proposal_owner",
    ${param('proposal_ids', true)} AS "proposal_ids",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 46;`
  await client.queryObject(OpRemoveProposal)

  const OpUpdateProposal = `CREATE OR REPLACE VIEW hafsql.op_update_proposal
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('proposal_id')} AS "proposal_id",
    ${param('creator')} AS "creator",
    ${amount(param('daily_pay'))} AS "daily_pay",
    ${symbol(param('daily_pay'))} AS "daily_pay_symbol",
    ${param('subject')} AS "subject",
    ${param('permlink')} AS "permlink",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 47;`
  await client.queryObject(OpUpdateProposal)

  const OpCollateralizedConvert =
    `CREATE OR REPLACE VIEW hafsql.op_collateralized_convert
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('owner')} AS "owner",
    ${param('requestid')} AS "requestid",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 48;`
  await client.queryObject(OpCollateralizedConvert)

  const OpRecurrentTransfer =
    `CREATE OR REPLACE VIEW hafsql.op_recurrent_transfer
  AS SELECT o.id AS op_id,
    hb.created_at AS "timestamp",
    ${param('from')} AS "from",
    ${param('to')} AS "to",
    ${amount(param('amount'))} AS "amount",
    ${symbol(param('amount'))} AS "symbol",
    ${param('memo')} AS "memo",
    ${param('recurrence')} AS "recurrence",
    ${param('executions')} AS "executions",
    ${param('extensions')} AS "extensions",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = 49;`
  await client.queryObject(OpRecurrentTransfer)
}

export const removeOperationViews = async () => {
  using client = await pool.connect()
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
  await client.queryObject(dropViews)
}

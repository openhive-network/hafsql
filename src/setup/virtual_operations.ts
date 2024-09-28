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

export const setupVirtualOperationViews = async () => {
  using client = await pool.connect()
  // The order of VOps can change on HF so we have to update them
  const OPs = 49
  // +1
  const VOFillConvertRequest =
    `CREATE OR REPLACE VIEW hafsql.vo_fill_convert_request
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${param('requestid')} AS requestid,
      ${amount(param('amount_in'))} AS amount_in,
      ${symbol(param('amount_in'))} AS amount_in_symbol,
      ${amount(param('amount_out'))} AS amount_out,
      ${symbol(param('amount_out'))} AS amount_out_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 1;`
  await client.queryObject(VOFillConvertRequest)

  // +2
  // deno-fmt-ignore
  const VOAuthorReward = `CREATE OR REPLACE VIEW hafsql.vo_author_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${amount(param('hbd_payout'))} AS hbd_payout,
      ${amount(param('hive_payout'))} AS hive_payout,
      ${amount(param('vesting_payout'))} AS vesting_payout,
      ${v2h(amount(param('vesting_payout')))} AS vesting_payout_hp,
      ${v2h(amount(param('vesting_payout')), block('o.id'))} AS vesting_payout_historical_hp,
      ${amount(param('curators_vesting_payout'))} AS curators_vesting_payout,
      ${v2h(amount(param('curators_vesting_payout')))} AS curators_vesting_payout_hp,
      ${v2h(amount(param('curators_vesting_payout')), block('o.id'))} AS curators_vesting_payout_historical_hp,
      ${param('payout_must_be_claimed')} payout_must_be_claimed,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 2;`
  await client.queryObject(VOAuthorReward)

  // +3
  const VOCurationReward = `CREATE OR REPLACE VIEW hafsql.vo_curation_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('curator')} AS curator,
      ${amount(param('reward'))} AS reward,
      ${symbol(param('reward'))} AS symbol,
      ${v2h(amount(param('reward')))} AS reward_hp,
      ${v2h(amount(param('reward')), block('o.id'))} AS reward_historical_hp,
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${param('payout_must_be_claimed')} AS payout_must_be_claimed,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 3;`
  await client.queryObject(VOCurationReward)

  // +4
  const VOCommentReward = `CREATE OR REPLACE VIEW hafsql.vo_comment_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${amount(param('payout'))} AS payout,
      ${param('author_rewards')}::numeric/1000 AS author_rewards,
      ${amount(param('total_payout_value'))} AS total_payout_value,
      ${amount(param('curator_payout_value'))} AS curator_payout_value,
      ${amount(param('beneficiary_payout_value'))} AS beneficiary_payout_value,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 4;`
  await client.queryObject(VOCommentReward)

  // +5
  const VOLiquidityReward = `CREATE OR REPLACE VIEW hafsql.vo_liquidity_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${amount(param('payout'))} AS payout,
      ${symbol(param('payout'))} AS symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 5;`
  await client.queryObject(VOLiquidityReward)

  // +6
  // deno-fmt-ignore
  const VOInterestOperation =
    `CREATE OR REPLACE VIEW hafsql.vo_interest_operation
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${amount(param('interest'))} AS interest,
      ${symbol(param('interest'))} AS interest_symbol,
      ${param('is_saved_into_hbd_balance')}::boolean AS is_saved_into_hbd_balance,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 6;`
  await client.queryObject(VOInterestOperation)

  // +7
  // deno-fmt-ignore
  const VOFillVestingWithdraw =
    `CREATE OR REPLACE VIEW hafsql.vo_fill_vesting_withdraw
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from_account')} AS from_account,
      ${param('to_account')} AS to_account,
      ${amount(param('withdrawn'))} AS withdrawn,
      ${symbol(param('withdrawn'))} AS withdrawn_symbol,
      ${amount(param('deposited'))} AS deposited,
      ${symbol(param('deposited'))} AS deposited_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 7;`
  await client.queryObject(VOFillVestingWithdraw)

  // +8
  const VOFillOrder = `CREATE OR REPLACE VIEW hafsql.vo_fill_order
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('current_owner')} AS current_owner,
      ${param('open_owner')} AS open_owner,
      ${param('current_orderid')} AS current_orderid,
      ${param('open_orderid')} AS open_orderid,
      ${amount(param('current_pays'))} AS current_pays,
      ${symbol(param('current_pays'))} AS current_pays_symbol,
      ${amount(param('open_pays'))} AS open_pays,
      ${symbol(param('open_pays'))} AS open_pays_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 8;`
  await client.queryObject(VOFillOrder)

  // +9
  const VOShutdownWitness = `CREATE OR REPLACE VIEW hafsql.vo_shutdown_witness
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 9;`
  await client.queryObject(VOShutdownWitness)

  // +10
  const VOFillTransferFromSavings =
    `CREATE OR REPLACE VIEW hafsql.vo_fill_transfer_from_savings
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from')} AS from,
      ${param('to')} AS to,
      ${param('request_id')} AS request_id,
      ${param('memo')} AS memo,
      ${amount(param('amount'))} AS amount,
      ${symbol(param('amount'))} AS symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 10;`
  await client.queryObject(VOFillTransferFromSavings)

  // +11
  const VOHardfork = `CREATE OR REPLACE VIEW hafsql.vo_hardfork
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('hardfork_id')} AS hardfork_id,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 11;`
  await client.queryObject(VOHardfork)

  // +12
  const VOCommentPayoutUpdate =
    `CREATE OR REPLACE VIEW hafsql.vo_comment_payout_update
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 12;`
  await client.queryObject(VOCommentPayoutUpdate)

  // +13
  // deno-fmt-ignore
  const VOReturnVestingDelegation =
    `CREATE OR REPLACE VIEW hafsql.vo_return_vesting_delegation
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('account')} AS account,
      ${amount(param('vesting_shares'))} AS vesting_shares,
      ${v2h(amount(param('vesting_shares')))} AS vesting_shares_hp,
      ${v2h(amount(param('vesting_shares')), block('o.id'))} AS vesting_shares_historical_hp,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 13;`
  await client.queryObject(VOReturnVestingDelegation)

  // +14
  // deno-fmt-ignore
  const VOCommentBenefactorReward =
    `CREATE OR REPLACE VIEW hafsql.vo_comment_benefactor_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('benefactor')} AS benefactor,
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${amount(param('hbd_payout'))} AS hbd_payout,
      ${amount(param('hive_payout'))} AS hive_payout,
      ${amount(param('vesting_payout'))} AS vesting_payout,
      ${v2h(amount(param('vesting_payout')))} AS vesting_payout_hp,
      ${v2h(amount(param('vesting_payout')), block('o.id'))} AS vesting_payout_historical_hp,
      ${param('payout_must_be_claimed')} AS payout_must_be_claimed,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 14;`
  await client.queryObject(VOCommentBenefactorReward)

  // +15
  // deno-fmt-ignore
  const VOProducerReward = `CREATE OR REPLACE VIEW hafsql.vo_producer_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('producer')} AS producer,
      ${amount(param('vesting_shares'))} AS vesting_shares,
      ${symbol(param('vesting_shares'))} AS vesting_shares_symbol,
      ${v2h(amount(param('vesting_shares')))} AS vesting_shares_hp,
      ${v2h(amount(param('vesting_shares')), block('o.id'))} AS vesting_shares_historical_hp,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 15;`
  await client.queryObject(VOProducerReward)

  // +16
  const VOClearNullAccountBalance =
    `CREATE OR REPLACE VIEW hafsql.vo_clear_null_account_balance
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('total_cleared')} AS total_cleared,
      array_to_json(array(
        select hafsql.asset_amount(
          jsonb_array_elements_text(${param('total_cleared', true)})
        ) || ' ' ||
        hafsql.asset_symbol(
          jsonb_array_elements_text(${param('total_cleared', true)})
        )
      )) AS total_cleared_formatted,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 16;`
  await client.queryObject(VOClearNullAccountBalance)

  // +17 - skipped trx_id & op_in_trx - redundant
  const VOProposalPay = `CREATE OR REPLACE VIEW hafsql.vo_proposal_pay
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('proposal_id')} AS proposal_id,
      ${param('receiver')} AS receiver,
      ${param('payer')} AS payer,
      ${amount(param('payment'))} AS payment,
      ${symbol(param('payment'))} AS symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 17;`
  await client.queryObject(VOProposalPay)

  // +18
  const VODHFFunding = `CREATE OR REPLACE VIEW hafsql.vo_dhf_funding
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('treasury')} AS treasury,
      ${amount(param('additional_funds'))} AS additional_funds,
      ${symbol(param('additional_funds'))} AS symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 18;`
  await client.queryObject(VODHFFunding)

  // +19
  const VOHardforkHive = `CREATE OR REPLACE VIEW hafsql.vo_hardfork_hive
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('account')} AS account,
      ${param('treasury')} AS treasury,
      ${param('other_affected_accounts')} AS other_affected_accounts,
      ${amount(param('hbd_transferred'))} AS hbd_transferred,
      ${amount(param('hive_transferred'))} AS hive_transferred,
      ${amount(param('total_hive_from_vests'))} AS total_hive_from_vests,
      ${amount(param('vests_converted'))} AS vests_converted,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 19;`
  await client.queryObject(VOHardforkHive)

  // +20
  const VOHardforkHiveRestore =
    `CREATE OR REPLACE VIEW hafsql.vo_hardfork_hive_restore
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('account')} AS account,
      ${param('treasury')} AS treasury,
      ${amount(param('hbd_transferred'))} AS hbd_transferred,
      ${amount(param('hive_transferred'))} AS hive_transferred,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 20;`
  await client.queryObject(VOHardforkHiveRestore)

  // +21
  const VODelayedVoting = `CREATE OR REPLACE VIEW hafsql.vo_delayed_voting
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('voter')} AS voter,
      ${param('votes')} AS votes,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 21;`
  await client.queryObject(VODelayedVoting)

  // +22
  const VOConsolidateTreasuryBalance =
    `CREATE OR REPLACE VIEW hafsql.vo_consolidate_treasury_balance
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('total_moved')} AS total_moved,
      array_to_json(array(
        select hafsql.asset_amount(
          jsonb_array_elements_text(${param('total_moved', true)})
        ) || ' ' ||
        hafsql.asset_symbol(
          jsonb_array_elements_text(${param('total_moved', true)})
        )
      )) AS total_moved_formatted,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 22;`
  await client.queryObject(VOConsolidateTreasuryBalance)

  // +23
  const VOEffectiveCommentVote =
    `CREATE OR REPLACE VIEW hafsql.vo_effective_comment_vote
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('voter')} AS voter,
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${param('weight')} AS weight,
      ${param('rshares')}::numeric AS rshares,
      ${param('total_vote_weight')} AS total_vote_weight,
      ${amount(param('pending_payout'))} AS pending_payout,
      ${symbol(param('pending_payout'))} AS pending_payout_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 23;`
  await client.queryObject(VOEffectiveCommentVote)

  // +24
  const VOIneffectiveDeleteComment =
    `CREATE OR REPLACE VIEW hafsql.vo_ineffective_delete_comment
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 24;`
  await client.queryObject(VOIneffectiveDeleteComment)

  // +25
  const VODHFConversion = `CREATE OR REPLACE VIEW hafsql.vo_dhf_conversion
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('treasury')} AS treasury,
      ${amount(param('hive_amount_in'))} AS hive_amount_in,
      ${amount(param('hbd_amount_out'))} AS hbd_amount_out,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 25;`
  await client.queryObject(VODHFConversion)

  // +26
  const VOExpiredAccountNotification =
    `CREATE OR REPLACE VIEW hafsql.vo_expired_account_notification
    AS SELECT o.id as op_id,
      ${param('account')} AS account,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 26;`
  await client.queryObject(VOExpiredAccountNotification)

  // +27
  const VOChangedRecoveryAccount =
    `CREATE OR REPLACE VIEW hafsql.vo_changed_recovery_account
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('account')} AS account,
      ${param('old_recovery_account')} AS old_recovery_account,
      ${param('new_recovery_account')} AS new_recovery_account,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 27;`
  await client.queryObject(VOChangedRecoveryAccount)

  // +28
  const VOTransferToVestingCompleted =
    `CREATE OR REPLACE VIEW hafsql.vo_transfer_to_vesting_completed
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from_account')} AS from_account,
      ${param('to_account')} AS to_account,
      ${amount(param('hive_vested'))} AS hive_vested,
      ${amount(param('vesting_shares_received'))} AS vesting_shares_received,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 28;`
  await client.queryObject(VOTransferToVestingCompleted)

  // +29
  const VOPowReward = `CREATE OR REPLACE VIEW hafsql.vo_pow_reward
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('worker')} AS worker,
      ${amount(param('reward'))} AS reward,
      ${symbol(param('reward'))} AS symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 29;`
  await client.queryObject(VOPowReward)

  // +30
  // deno-fmt-ignore
  const VOVestingSharesSplit =
    `CREATE OR REPLACE VIEW hafsql.vo_vesting_shares_split
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${amount(param('vesting_shares_before_split'))} AS vesting_shares_before_split,
      ${v2h(amount(param('vesting_shares_before_split')))} AS before_hp,
      ${v2h(amount(param('vesting_shares_before_split')), block('o.id'))} AS before_historical_hp,
      ${amount(param('vesting_shares_after_split'))} AS vesting_shares_after_split,
      ${v2h(amount(param('vesting_shares_after_split')))} AS after_hp,
      ${v2h(amount(param('vesting_shares_after_split')), block('o.id'))} AS after_historical_hp,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 30;`
  await client.queryObject(VOVestingSharesSplit)

  // +31
  // deno-fmt-ignore
  const VOAccountCreated = `CREATE OR REPLACE VIEW hafsql.vo_account_created
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('new_account_name')} AS new_account_name,
      ${param('creator')} AS creator,
      ${amount(param('initial_vesting_shares'))} AS initial_vesting_shares,
      ${v2h(amount(param('initial_vesting_shares')))} AS vesting_hp,
      ${v2h(amount(param('initial_vesting_shares')), block('o.id'))} AS vesting_historical_hp,
      ${amount(param('initial_delegation'))} AS initial_delegation,
      ${v2h(amount(param('initial_delegation')))} AS delegation_hp,
      ${v2h(amount(param('initial_delegation')), block('o.id'))} AS delegation_historical_hp,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 31;`
  await client.queryObject(VOAccountCreated)

  // +32
  const VOFillCollateralizedConvertRequest =
    `CREATE OR REPLACE VIEW hafsql.vo_fill_collateralized_convert_request
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${param('requestid')} AS requestid,
      ${amount(param('amount_in'))} AS amount_in,
      ${symbol(param('amount_in'))} AS amount_in_symbol,
      ${amount(param('amount_out'))} AS amount_out,
      ${symbol(param('amount_out'))} AS amount_out_symbol,
      ${amount(param('excess_collateral'))} AS excess_collateral,
      ${symbol(param('excess_collateral'))} AS excess_collateral_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 32;`
  await client.queryObject(VOFillCollateralizedConvertRequest)

  // +33
  const VOSystemWarningOperation =
    `CREATE OR REPLACE VIEW hafsql.vo_system_warning_operation
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('message')} AS message,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 33;`
  await client.queryObject(VOSystemWarningOperation)

  // +34
  const VOFillRecurrentTransfer =
    `CREATE OR REPLACE VIEW hafsql.vo_fill_recurrent_transfer
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from')} AS from,
      ${param('to')} AS to,
      ${amount(param('amount'))} AS amount,
      ${symbol(param('amount'))} AS symbol,
      ${param('memo')} AS memo,
      ${param('remaining_executions')} AS remaining_executions,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 34;`
  await client.queryObject(VOFillRecurrentTransfer)

  // +35
  const VOFailedRecurrentTransfer =
    `CREATE OR REPLACE VIEW hafsql.vo_failed_recurrent_transfer
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from')} AS from,
      ${param('to')} AS to,
      ${amount(param('amount'))} AS amount,
      ${symbol(param('amount'))} AS symbol,
      ${param('memo')} AS memo,
      ${param('consecutive_failures')} AS consecutive_failures,
      ${param('remaining_executions')} AS remaining_executions,
      ${param('deleted')} AS deleted,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 35;`
  await client.queryObject(VOFailedRecurrentTransfer)

  // +36
  const VOLimitOrderCancelled =
    `CREATE OR REPLACE VIEW hafsql.vo_limit_order_cancelled
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('seller')} AS seller,
      ${param('orderid')} AS orderid,
      ${amount(param('amount_back'))} AS amount_back,
      ${symbol(param('amount_back'))} AS symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 36;`
  await client.queryObject(VOLimitOrderCancelled)

  // +37
  const VOProducerMissed = `CREATE OR REPLACE VIEW hafsql.vo_producer_missed
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('producer')} AS producer,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 37;`
  await client.queryObject(VOProducerMissed)

  // +38
  const VOProposalFee = `CREATE OR REPLACE VIEW hafsql.vo_proposal_fee
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('creator')} AS creator,
      ${param('treasury')} AS treasury,
      ${param('proposal_id')} AS proposal_id,
      ${amount(param('fee'))} AS fee,
      ${symbol(param('fee'))} AS fee_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 38;`
  await client.queryObject(VOProposalFee)

  // +39
  const VOCollateralizedConvertImmediateConversion =
    `CREATE OR REPLACE VIEW hafsql.vo_collateralized_convert_immediate_conversion
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('owner')} AS owner,
      ${param('requestid')} AS requestid,
      ${amount(param('hbd_out'))} AS hbd_out,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 39;`
  await client.queryObject(VOCollateralizedConvertImmediateConversion)

  // +40
  const VOEscrowApproved = `CREATE OR REPLACE VIEW hafsql.vo_escrow_approved
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from')} AS from,
      ${param('to')} AS to,
      ${param('agent')} AS agent,
      ${param('escrow_id')} AS escrow_id,
      ${amount(param('fee'))} AS fee,
      ${symbol(param('fee'))} AS fee_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 40;`
  await client.queryObject(VOEscrowApproved)

  // +41
  const VOEscrowRejected = `CREATE OR REPLACE VIEW hafsql.vo_escrow_rejected
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('from')} AS from,
      ${param('to')} AS to,
      ${param('agent')} AS agent,
      ${param('escrow_id')} AS escrow_id,
      ${amount(param('hbd_amount'))} AS hbd_amount,
      ${amount(param('hive_amount'))} AS hive_amount,
      ${amount(param('fee'))} AS fee,
      ${symbol(param('fee'))} AS fee_symbol,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 41;`
  await client.queryObject(VOEscrowRejected)

  // +42
  const VOProxyCleared = `CREATE OR REPLACE VIEW hafsql.vo_proxy_cleared
    AS SELECT o.id as op_id,
      hb.created_at AS "timestamp",
      ${param('account')} AS account,
      ${param('proxy')} AS proxy,
      ${block('o.id')} as block_num
    FROM hive.operations o
    JOIN hive.blocks hb ON hb.num = ${block('o.id')}
    WHERE hive.operation_id_to_type_id(o.id) = ${OPs} + 42;`
  await client.queryObject(VOProxyCleared)
}

export const removeVirtualOperationViews = async () => {
  using client = await pool.connect()
  const dropViews = `DROP VIEW IF EXISTS
    hafsql.vo_fill_convert_request,
    hafsql.vo_author_reward,
    hafsql.vo_curation_reward,
    hafsql.vo_comment_reward,
    hafsql.vo_liquidity_reward,
    hafsql.vo_interest_operation,
    hafsql.vo_fill_vesting_withdraw,
    hafsql.vo_fill_order,
    hafsql.vo_shutdown_witness,
    hafsql.vo_fill_transfer_from_savings,
    hafsql.vo_hardfork,
    hafsql.vo_comment_payout_update,
    hafsql.vo_return_vesting_delegation,
    hafsql.vo_comment_benefactor_reward,
    hafsql.vo_producer_reward,
    hafsql.vo_clear_null_account_balance,
    hafsql.vo_proposal_pay,
    hafsql.vo_dhf_funding,
    hafsql.vo_hardfork_hive,
    hafsql.vo_hardfork_hive_restore,
    hafsql.vo_delayed_voting,
    hafsql.vo_consolidate_treasury_balance,
    hafsql.vo_effective_comment_vote,
    hafsql.vo_ineffective_delete_comment,
    hafsql.vo_dhf_conversion,
    hafsql.vo_expired_account_notification,
    hafsql.vo_changed_recovery_account,
    hafsql.vo_transfer_to_vesting_completed,
    hafsql.vo_pow_reward,
    hafsql.vo_vesting_shares_split,
    hafsql.vo_account_created,
    hafsql.vo_fill_collateralized_convert_request,
    hafsql.vo_system_warning_operation,
    hafsql.vo_fill_recurrent_transfer,
    hafsql.vo_failed_recurrent_transfer,
    hafsql.vo_limit_order_cancelled,
    hafsql.vo_producer_missed,
    hafsql.vo_proposal_fee,
    hafsql.vo_collateralized_convert_immediate_conversion,
    hafsql.vo_escrow_approved,
    hafsql.vo_escrow_rejected,
    hafsql.vo_proxy_cleared;`
  await client.queryObject(dropViews)
}

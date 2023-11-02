import { pool } from '../database.js'

export const setupVirtualOperationViews = async () => {
  // The order of VOps can change on HF so we have to update them
  const OPs = 49
  // +1
  const VOFillConvertRequest = `CREATE OR REPLACE VIEW hafsql.vo_fill_convert_request
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'requestid'::text AS requestid,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in_symbol,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 1;`
  await pool.query(VOFillConvertRequest)

  // +2
  const VOAuthorReward = `CREATE OR REPLACE VIEW hafsql.vo_author_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_payout'::text) AS hbd_payout,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_payout'::text) AS hive_payout,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_payout'::text AS vesting_payout,
      (o.body_binary::jsonb -> 'value'::text) ->> 'curators_vesting_payout'::text AS curators_vesting_payout,
      (o.body_binary::jsonb -> 'value'::text) ->> 'payout_must_be_claimed'::text AS payout_must_be_claimed
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 2;`
  await pool.query(VOAuthorReward)

  // +3
  const VOCurationReward = `CREATE OR REPLACE VIEW hafsql.vo_curation_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'curator'::text AS curator,
      (o.body_binary::jsonb -> 'value'::text) ->> 'reward'::text AS reward,
      (o.body_binary::jsonb -> 'value'::text) ->> 'comment_author'::text AS comment_author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'comment_permlink'::text AS comment_permlink,
      (o.body_binary::jsonb -> 'value'::text) ->> 'payout_must_be_claimed'::text AS payout_must_be_claimed
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 3;`
  await pool.query(VOCurationReward)

  // +4
  const VOCommentReward = `CREATE OR REPLACE VIEW hafsql.vo_comment_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'payout'::text) AS payout,
      (o.body_binary::jsonb -> 'value'::text) ->> 'author_rewards'::text AS author_rewards,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'total_payout_value'::text) AS total_payout_value,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'curator_payout_value'::text) AS curator_payout_value,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'beneficiary_payout_value'::text) AS beneficiary_payout_value
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 4;`
  await pool.query(VOCommentReward)

  // +5
  const VOLiquidityReward = `CREATE OR REPLACE VIEW hafsql.vo_liquidity_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'payout'::text AS payout
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 5;`
  await pool.query(VOLiquidityReward)

  // +6
  const VOInterestOperation = `CREATE OR REPLACE VIEW hafsql.vo_interest_operation
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'interest'::text) AS interest,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'interest'::text) AS interest_symbol,
      (o.body_binary::jsonb -> 'value'::text) ->> 'is_saved_into_hbd_balance'::text AS is_saved_into_hbd_balance
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 6;`
  await pool.query(VOInterestOperation)

  // +7
  const VOFillVestingWithdraw = `CREATE OR REPLACE VIEW hafsql.vo_fill_vesting_withdraw
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from_account'::text AS from_account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to_account'::text AS to_account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'withdrawn'::text AS withdrawn,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'deposited'::text) AS deposited,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'deposited'::text) AS deposited_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 7;`
  await pool.query(VOFillVestingWithdraw)

  // +8
  const VOFillOrder = `CREATE OR REPLACE VIEW hafsql.vo_fill_order
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'current_owner'::text AS current_owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'open_owner'::text AS open_owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'current_orderid'::text AS current_orderid,
      (o.body_binary::jsonb -> 'value'::text) ->> 'open_orderid'::text AS open_orderid,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'current_pays'::text) AS current_pays,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'current_pays'::text) AS current_pays_symbol,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'open_pays'::text) AS open_pays,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'open_pays'::text) AS open_pays_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 8;`
  await pool.query(VOFillOrder)

  // +9
  const VOShutdownWitness = `CREATE OR REPLACE VIEW hafsql.vo_shutdown_witness
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 9;`
  await pool.query(VOShutdownWitness)

  // +10
  const VOFillTransferFromSavings = `CREATE OR REPLACE VIEW hafsql.vo_fill_transfer_from_savings
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS to,
      (o.body_binary::jsonb -> 'value'::text) ->> 'request_id'::text AS request_id,
      (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text) AS amount,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text) AS amount_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 10;`
  await pool.query(VOFillTransferFromSavings)

  // +11
  const VOHardfork = `CREATE OR REPLACE VIEW hafsql.vo_hardfork
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'hardfork_id'::text AS hardfork_id
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 11;`
  await pool.query(VOHardfork)

  // +12
  const VOCommentPayoutUpdate = `CREATE OR REPLACE VIEW hafsql.vo_comment_payout_update
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 12;`
  await pool.query(VOCommentPayoutUpdate)

  // +13
  const VOReturnVestingDelegation = `CREATE OR REPLACE VIEW hafsql.vo_return_vesting_delegation
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS vesting_shares
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 13;`
  await pool.query(VOReturnVestingDelegation)

  // +14
  const VOCommentBenefactorReward = `CREATE OR REPLACE VIEW hafsql.vo_comment_benefactor_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'benefactor'::text AS benefactor,
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_payout'::text) AS hbd_payout,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_payout'::text) AS hbd_payout_symbol,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_payout'::text) AS hive_payout,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'hive_payout'::text) AS hive_payout_symbol,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_payout'::text AS vesting_payout,
      (o.body_binary::jsonb -> 'value'::text) ->> 'payout_must_be_claimed'::text AS payout_must_be_claimed
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 14;`
  await pool.query(VOCommentBenefactorReward)

  // +15
  const VOProducerReward = `CREATE OR REPLACE VIEW hafsql.vo_producer_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'producer'::text AS producer,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS vesting_shares
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 15;`
  await pool.query(VOProducerReward)

  // +16
  const VOClearNullAccountBalance = `CREATE OR REPLACE VIEW hafsql.vo_clear_null_account_balance
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'total_cleared'::text AS total_cleared
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 16;`
  await pool.query(VOClearNullAccountBalance)

  // +17 - skipped trx_id & op_in_trx - redundant
  const VOProposalPay = `CREATE OR REPLACE VIEW hafsql.vo_proposal_pay
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'proposal_id'::text AS proposal_id,
      (o.body_binary::jsonb -> 'value'::text) ->> 'receiver'::text AS receiver,
      (o.body_binary::jsonb -> 'value'::text) ->> 'payer'::text AS payer,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'payment'::text) AS payment,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'payment'::text) AS payment_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 17;`
  await pool.query(VOProposalPay)

  // +18
  const VODHFFunding = `CREATE OR REPLACE VIEW hafsql.vo_dhf_funding
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'additional_funds'::text) AS additional_funds,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'additional_funds'::text) AS additional_funds_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 18;`
  await pool.query(VODHFFunding)

  // +19
  const VOHardforkHive = `CREATE OR REPLACE VIEW hafsql.vo_hardfork_hive
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      (o.body_binary::jsonb -> 'value'::text) ->> 'other_affected_accounts'::text AS other_affected_accounts,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_transferred'::text) AS hbd_transferred,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_transferred'::text) AS hive_transferred,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'total_hive_from_vests'::text) AS total_hive_from_vests,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vests_converted'::text AS vests_converted
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 19;`
  await pool.query(VOHardforkHive)

  // +20
  const VOHardforkHiveRestore = `CREATE OR REPLACE VIEW hafsql.vo_hardfork_hive_restore
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_transferred'::text) AS hbd_transferred,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_transferred'::text) AS hive_transferred
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 20;`
  await pool.query(VOHardforkHiveRestore)

  // +21
  const VODelayedVoting = `CREATE OR REPLACE VIEW hafsql.vo_delayed_voting
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'voter'::text AS voter,
      (o.body_binary::jsonb -> 'value'::text) ->> 'votes'::text AS votes
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 21;`
  await pool.query(VODelayedVoting)

  // +22
  const VOConsolidateTreasuryBalance = `CREATE OR REPLACE VIEW hafsql.vo_consolidate_treasury_balance
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'total_moved'::text AS total_moved
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 22;`
  await pool.query(VOConsolidateTreasuryBalance)

  // +23
  const VOEffectiveCommentVote = `CREATE OR REPLACE VIEW hafsql.vo_effective_comment_vote
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'voter'::text AS voter,
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      (o.body_binary::jsonb -> 'value'::text) ->> 'weight'::text AS weight,
      (o.body_binary::jsonb -> 'value'::text) ->> 'rshares'::text AS rshares,
      (o.body_binary::jsonb -> 'value'::text) ->> 'total_vote_weight'::text AS total_vote_weight,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'pending_payout'::text) AS pending_payout,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'pending_payout'::text) AS pending_payout_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 23;`
  await pool.query(VOEffectiveCommentVote)

  // +24
  const VOIneffectiveDeleteComment = `CREATE OR REPLACE VIEW hafsql.vo_ineffective_delete_comment
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body_binary::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 24;`
  await pool.query(VOIneffectiveDeleteComment)

  // +25
  const VODHFConversion = `CREATE OR REPLACE VIEW hafsql.vo_dhf_conversion
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_amount_in'::text) AS hive_amount_in,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_amount_out'::text) AS hbd_amount_out
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 25;`
  await pool.query(VODHFConversion)

  // +26
  const VOExpiredAccountNotification = `CREATE OR REPLACE VIEW hafsql.vo_expired_account_notification
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS account
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 26;`
  await pool.query(VOExpiredAccountNotification)

  // +27
  const VOChangedRecoveryAccount = `CREATE OR REPLACE VIEW hafsql.vo_changed_recovery_account
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'old_recovery_account'::text AS old_recovery_account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'new_recovery_account'::text AS new_recovery_account
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 27;`
  await pool.query(VOChangedRecoveryAccount)

  // +28
  const VOTransferToVestingCompleted = `CREATE OR REPLACE VIEW hafsql.vo_transfer_to_vesting_completed
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from_account'::text AS from_account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to_account'::text AS to_account,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_vested'::text) AS hive_vested,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares_received'::text AS vesting_shares_received
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 28;`
  await pool.query(VOTransferToVestingCompleted)

  // +29
  const VOPowReward = `CREATE OR REPLACE VIEW hafsql.vo_pow_reward
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'worker'::text AS worker,
      (o.body_binary::jsonb -> 'value'::text) ->> 'reward'::text AS reward
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 29;`
  await pool.query(VOPowReward)

  // +30
  const VOVestingSharesSplit = `CREATE OR REPLACE VIEW hafsql.vo_vesting_shares_split
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares_before_split'::text AS vesting_shares_before_split,
      (o.body_binary::jsonb -> 'value'::text) ->> 'vesting_shares_after_split'::text AS vesting_shares_after_split
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 30;`
  await pool.query(VOVestingSharesSplit)

  // +31
  const VOAccountCreated = `CREATE OR REPLACE VIEW hafsql.vo_account_created
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'new_account_name'::text AS new_account_name,
      (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS creator,
      (o.body_binary::jsonb -> 'value'::text) ->> 'initial_vesting_shares'::text AS initial_vesting_shares,
      (o.body_binary::jsonb -> 'value'::text) ->> 'initial_delegation'::text AS initial_delegation
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 31;`
  await pool.query(VOAccountCreated)

  // +32
  const VOFillCollateralizedConvertRequest = `CREATE OR REPLACE VIEW hafsql.vo_fill_collateralized_convert_request
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'requestid'::text AS requestid,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in_symbol,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out_symbol,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'excess_collateral'::text) AS excess_collateral,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'excess_collateral'::text) AS excess_collateral_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 32;`
  await pool.query(VOFillCollateralizedConvertRequest)

  // +33
  const VOSystemWarningOperation = `CREATE OR REPLACE VIEW hafsql.vo_system_warning_operation
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'message'::text AS message
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 33;`
  await pool.query(VOSystemWarningOperation)

  // +34
  const VOFillRecurrentTransfer = `CREATE OR REPLACE VIEW hafsql.vo_fill_recurrent_transfer
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS to,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text) AS amount,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text) AS amount_symbol,
      (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
      (o.body_binary::jsonb -> 'value'::text) ->> 'remaining_executions'::text AS remaining_executions
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 34;`
  await pool.query(VOFillRecurrentTransfer)

  // +35
  const VOFailedRecurrentTransfer = `CREATE OR REPLACE VIEW hafsql.vo_failed_recurrent_transfer
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS to,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text) AS amount,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount'::text) AS amount_symbol,
      (o.body_binary::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
      (o.body_binary::jsonb -> 'value'::text) ->> 'consecutive_failures'::text AS consecutive_failures,
      (o.body_binary::jsonb -> 'value'::text) ->> 'remaining_executions'::text AS remaining_executions,
      (o.body_binary::jsonb -> 'value'::text) ->> 'deleted'::text AS deleted
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 35;`
  await pool.query(VOFailedRecurrentTransfer)

  // +36
  const VOLimitOrderCancelled = `CREATE OR REPLACE VIEW hafsql.vo_limit_order_cancelled
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'seller'::text AS seller,
      (o.body_binary::jsonb -> 'value'::text) ->> 'orderid'::text AS orderid,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'amount_back'::text) AS amount_back,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'amount_back'::text) AS amount_back_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 36;`
  await pool.query(VOLimitOrderCancelled)

  // +37
  const VOProducerMissed = `CREATE OR REPLACE VIEW hafsql.vo_producer_missed
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'producer'::text AS producer
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 37;`
  await pool.query(VOProducerMissed)

  // +38
  const VOProposalFee = `CREATE OR REPLACE VIEW hafsql.vo_proposal_fee
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'creator'::text AS creator,
      (o.body_binary::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      (o.body_binary::jsonb -> 'value'::text) ->> 'proposal_id'::text AS proposal_id,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text) AS fee,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text) AS fee_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 38;`
  await pool.query(VOProposalFee)

  // +39
  const VOCollateralizedConvertImmediateConversion = `CREATE OR REPLACE VIEW hafsql.vo_collateralized_convert_immediate_conversion
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body_binary::jsonb -> 'value'::text) ->> 'requestid'::text AS requestid,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_out'::text) AS hbd_out,
      hafsql_assetsymbol((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_out'::text) AS hbd_out_symbol
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 39;`
  await pool.query(VOCollateralizedConvertImmediateConversion)

  // +40
  const VOEscrowApproved = `CREATE OR REPLACE VIEW hafsql.vo_escrow_approved
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS to,
      (o.body_binary::jsonb -> 'value'::text) ->> 'agent'::text AS agent,
      (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_id'::text AS escrow_id,
      (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS fee
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 40;`
  await pool.query(VOEscrowApproved)

  // +41
  const VOEscrowRejected = `CREATE OR REPLACE VIEW hafsql.vo_escrow_rejected
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body_binary::jsonb -> 'value'::text) ->> 'to'::text AS to,
      (o.body_binary::jsonb -> 'value'::text) ->> 'agent'::text AS agent,
      (o.body_binary::jsonb -> 'value'::text) ->> 'escrow_id'::text AS escrow_id,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hbd_amount'::text) AS hbd_amount,
      hafsql_assetamount((o.body_binary::jsonb -> 'value'::text) ->> 'hive_amount'::text) AS hive_amount,
      (o.body_binary::jsonb -> 'value'::text) ->> 'fee'::text AS fee
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 41;`
  await pool.query(VOEscrowRejected)

  // +42
  const VOProxyCleared = `CREATE OR REPLACE VIEW hafsql.vo_proxy_cleared
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body_binary::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body_binary::jsonb -> 'value'::text) ->> 'proxy'::text AS proxy
    FROM hive.operations o
    WHERE o.op_type_id = ${OPs} + 42;`
  await pool.query(VOProxyCleared)
}

export const removeVirtualOperationViews = async () => {
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
  await pool.query(dropViews)
}

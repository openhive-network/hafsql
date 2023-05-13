import { pool } from '../database.js'

export const setupVirtualOperationViews = async () => {
  // The order of VOps can change on HF so we use their names instead of id
  // +1
  const VOFillConvertRequest = `CREATE OR REPLACE VIEW hafsql."VOFillConvertRequest"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body::jsonb -> 'value'::text) ->> 'requestid'::text AS requestid,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in_symbol,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::fill_convert_request_operation');`
  await pool.query(VOFillConvertRequest)

  // +2
  const VOAuthorReward = `CREATE OR REPLACE VIEW hafsql."VOAuthorReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_payout'::text) AS hbd_payout,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_payout'::text) AS hive_payout,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_payout'::text AS vesting_payout,
      (o.body::jsonb -> 'value'::text) ->> 'curators_vesting_payout'::text AS curators_vesting_payout,
      (o.body::jsonb -> 'value'::text) ->> 'payout_must_be_claimed'::text AS payout_must_be_claimed
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::author_reward_operation');`
  await pool.query(VOAuthorReward)

  // +3
  const VOCurationReward = `CREATE OR REPLACE VIEW hafsql."VOCurationReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'curator'::text AS curator,
      (o.body::jsonb -> 'value'::text) ->> 'reward'::text AS reward,
      (o.body::jsonb -> 'value'::text) ->> 'comment_author'::text AS comment_author,
      (o.body::jsonb -> 'value'::text) ->> 'comment_permlink'::text AS comment_permlink,
      (o.body::jsonb -> 'value'::text) ->> 'payout_must_be_claimed'::text AS payout_must_be_claimed
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::curation_reward_operation');`
  await pool.query(VOCurationReward)

  // +4
  const VOCommentReward = `CREATE OR REPLACE VIEW hafsql."VOCommentReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      (o.body::jsonb -> 'value'::text) ->> 'payout'::text AS payout,
      (o.body::jsonb -> 'value'::text) ->> 'author_rewards'::text AS author_rewards,
      (o.body::jsonb -> 'value'::text) ->> 'total_payout_value'::text AS total_payout_value,
      (o.body::jsonb -> 'value'::text) ->> 'curator_payout_value'::text AS curator_payout_value,
      (o.body::jsonb -> 'value'::text) ->> 'beneficiary_payout_value'::text AS beneficiary_payout_value
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::comment_reward_operation');`
  await pool.query(VOCommentReward)
  
  // +5
  const VOLiquidityReward = `CREATE OR REPLACE VIEW hafsql."VOLiquidityReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body::jsonb -> 'value'::text) ->> 'payout'::text AS payout
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::liquidity_reward_operation');`
  await pool.query(VOLiquidityReward)

  // +6
  const VOInterestOperation = `CREATE OR REPLACE VIEW hafsql."VOInterestOperation"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'interest'::text) AS interest,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'interest'::text) AS interest_symbol,
      (o.body::jsonb -> 'value'::text) ->> 'is_saved_into_hbd_balance'::text AS is_saved_into_hbd_balance
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::interest_operation');`
  await pool.query(VOInterestOperation)

  // +7
  const VOFillVestingWithdraw = `CREATE OR REPLACE VIEW hafsql."VOFillVestingWithdraw"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from_account'::text AS from_account,
      (o.body::jsonb -> 'value'::text) ->> 'to_account'::text AS to_account,
      (o.body::jsonb -> 'value'::text) ->> 'withdrawn'::text AS withdrawn,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'deposited'::text) AS deposited,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'deposited'::text) AS deposited_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::fill_vesting_withdraw_operation');`
  await pool.query(VOFillVestingWithdraw)

  // +8
  const VOFillOrder = `CREATE OR REPLACE VIEW hafsql."VOFillOrder"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'current_owner'::text AS current_owner,
      (o.body::jsonb -> 'value'::text) ->> 'open_owner'::text AS open_owner,
      (o.body::jsonb -> 'value'::text) ->> 'current_orderid'::text AS current_orderid,
      (o.body::jsonb -> 'value'::text) ->> 'open_orderid'::text AS open_orderid,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'current_pays'::text) AS current_pays,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'current_pays'::text) AS current_pays_symbol,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'open_pays'::text) AS open_pays,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'open_pays'::text) AS open_pays_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::fill_order_operation');`
  await pool.query(VOFillOrder)

  // +9
  const VOShutdownWitness = `CREATE OR REPLACE VIEW hafsql."VOShutdownWitness"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::shutdown_witness_operation');`
  await pool.query(VOShutdownWitness)

  // +10
  const VOFillTransferFromSavings = `CREATE OR REPLACE VIEW hafsql."VOFillTransferFromSavings"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body::jsonb -> 'value'::text) ->> 'to'::text AS to,
      (o.body::jsonb -> 'value'::text) ->> 'request_id'::text AS request_id,
      (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount'::text) AS amount,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount'::text) AS amount_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::fill_transfer_from_savings_operation');`
  await pool.query(VOFillTransferFromSavings)

  // +11
  const VOHardfork = `CREATE OR REPLACE VIEW hafsql."VOHardfork"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'hardfork_id'::text AS hardfork_id
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::hardfork_operation');`
  await pool.query(VOHardfork)

  // +12
  const VOCommentPayoutUpdate = `CREATE OR REPLACE VIEW hafsql."VOCommentPayoutUpdate"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::comment_payout_update_operation');`
  await pool.query(VOCommentPayoutUpdate)

  // +13
  const VOReturnVestingDelegation = `CREATE OR REPLACE VIEW hafsql."VOReturnVestingDelegation"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS vesting_shares
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::return_vesting_delegation_operation');`
  await pool.query(VOReturnVestingDelegation)

  // +14
  const VOCommentBenefactorReward = `CREATE OR REPLACE VIEW hafsql."VOCommentBenefactorReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'benefactor'::text AS benefactor,
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_payout'::text) AS hbd_payout,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'hbd_payout'::text) AS hbd_payout_symbol,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_payout'::text) AS hive_payout,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'hive_payout'::text) AS hive_payout_symbol,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_payout'::text AS vesting_payout,
      (o.body::jsonb -> 'value'::text) ->> 'payout_must_be_claimed'::text AS payout_must_be_claimed
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::comment_benefactor_reward_operation');`
  await pool.query(VOCommentBenefactorReward)

  // +15
  const VOProducerReward = `CREATE OR REPLACE VIEW hafsql."VOProducerReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'producer'::text AS producer,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_shares'::text AS vesting_shares
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::producer_reward_operation');`
  await pool.query(VOProducerReward)

  // +16
  const VOClearNullAccountBalance = `CREATE OR REPLACE VIEW hafsql."VOClearNullAccountBalance"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'total_cleared'::text AS total_cleared
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::clear_null_account_balance_operation');`
  await pool.query(VOClearNullAccountBalance)

  // +17 - skipped trx_id & op_in_trx - redundant
  const VOProposalPay = `CREATE OR REPLACE VIEW hafsql."VOProposalPay"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'proposal_id'::text AS proposal_id,
      (o.body::jsonb -> 'value'::text) ->> 'receiver'::text AS receiver,
      (o.body::jsonb -> 'value'::text) ->> 'payer'::text AS payer,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'payment'::text) AS payment,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'payment'::text) AS payment_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::proposal_pay_operation');`
  await pool.query(VOProposalPay)

  // +18
  const VODHFFunding = `CREATE OR REPLACE VIEW hafsql."VODHFFunding"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'additional_funds'::text) AS additional_funds,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'additional_funds'::text) AS additional_funds_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::dhf_funding_operation');`
  await pool.query(VODHFFunding)

  // +19
  const VOHardforkHive = `CREATE OR REPLACE VIEW hafsql."VOHardforkHive"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      (o.body::jsonb -> 'value'::text) ->> 'other_affected_accounts'::text AS other_affected_accounts,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_transferred'::text) AS hbd_transferred,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_transferred'::text) AS hive_transferred,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'total_hive_from_vests'::text) AS total_hive_from_vests,
      (o.body::jsonb -> 'value'::text) ->> 'vests_converted'::text AS vests_converted
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::hardfork_hive_operation');`
  await pool.query(VOHardforkHive)

  // +20
  const VOHardforkHiveRestore = `CREATE OR REPLACE VIEW hafsql."VOHardforkHiveRestore"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_transferred'::text) AS hbd_transferred,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_transferred'::text) AS hive_transferred
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::hardfork_hive_restore_operation');`
  await pool.query(VOHardforkHiveRestore)

  // +21
  const VODelayedVoting = `CREATE OR REPLACE VIEW hafsql."VODelayedVoting"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'voter'::text AS voter,
      (o.body::jsonb -> 'value'::text) ->> 'votes'::text AS votes
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::delayed_voting_operation');`
  await pool.query(VODelayedVoting)

  // +22
  const VOConsolidateTreasuryBalance = `CREATE OR REPLACE VIEW hafsql."VOConsolidateTreasuryBalance"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'total_moved'::text AS total_moved
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::consolidate_treasury_balance_operation');`
  await pool.query(VOConsolidateTreasuryBalance)

  // +23
  const VOEffectiveCommentVote = `CREATE OR REPLACE VIEW hafsql."VOEffectiveCommentVote"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'voter'::text AS voter,
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink,
      (o.body::jsonb -> 'value'::text) ->> 'weight'::text AS weight,
      (o.body::jsonb -> 'value'::text) ->> 'rshares'::text AS rshares,
      (o.body::jsonb -> 'value'::text) ->> 'total_vote_weight'::text AS total_vote_weight,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'pending_payout'::text) AS pending_payout,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'pending_payout'::text) AS pending_payout_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::effective_comment_vote_operation');`
  await pool.query(VOEffectiveCommentVote)

  // +24
  const VOIneffectiveDeleteComment = `CREATE OR REPLACE VIEW hafsql."VOIneffectiveDeleteComment"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'author'::text AS author,
      (o.body::jsonb -> 'value'::text) ->> 'permlink'::text AS permlink
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::ineffective_delete_comment_operation');`
  await pool.query(VOIneffectiveDeleteComment)

  // +25
  const VODHFConversion = `CREATE OR REPLACE VIEW hafsql."VODHFConversion"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_amount_in'::text) AS hive_amount_in,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_amount_out'::text) AS hbd_amount_out
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::dhf_conversion_operation');`
  await pool.query(VODHFConversion)

  // +26
  const VOExpiredAccountNotification = `CREATE OR REPLACE VIEW hafsql."VOExpiredAccountNotification"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'account'::text AS account
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::expired_account_notification_operation');`
  await pool.query(VOExpiredAccountNotification)

  // +27
  const VOChangedRecoveryAccount = `CREATE OR REPLACE VIEW hafsql."VOChangedRecoveryAccount"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body::jsonb -> 'value'::text) ->> 'old_recovery_account'::text AS old_recovery_account,
      (o.body::jsonb -> 'value'::text) ->> 'new_recovery_account'::text AS new_recovery_account
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::changed_recovery_account_operation');`
  await pool.query(VOChangedRecoveryAccount)

  // +28
  const VOTransferToVestingCompleted = `CREATE OR REPLACE VIEW hafsql."VOTransferToVestingCompleted"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from_account'::text AS from_account,
      (o.body::jsonb -> 'value'::text) ->> 'to_account'::text AS to_account,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_vested'::text) AS hive_vested,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_shares_received'::text AS vesting_shares_received
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::transfer_to_vesting_completed_operation');`
  await pool.query(VOTransferToVestingCompleted)

  // +29
  const VOPowReward = `CREATE OR REPLACE VIEW hafsql."VOPowReward"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'worker'::text AS worker,
      (o.body::jsonb -> 'value'::text) ->> 'reward'::text AS reward
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::pow_reward_operation');`
  await pool.query(VOPowReward)

  // +30
  const VOVestingSharesSplit = `CREATE OR REPLACE VIEW hafsql."VOVestingSharesSplit"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_shares_before_split'::text AS vesting_shares_before_split,
      (o.body::jsonb -> 'value'::text) ->> 'vesting_shares_after_split'::text AS vesting_shares_after_split
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::vesting_shares_split_operation');`
  await pool.query(VOVestingSharesSplit)

  // +31
  const VOAccountCreated = `CREATE OR REPLACE VIEW hafsql."VOAccountCreated"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'new_account_name'::text AS new_account_name,
      (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS creator,
      (o.body::jsonb -> 'value'::text) ->> 'initial_vesting_shares'::text AS initial_vesting_shares,
      (o.body::jsonb -> 'value'::text) ->> 'initial_delegation'::text AS initial_delegation
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::account_created_operation');`
  await pool.query(VOAccountCreated)

  // +32
  const VOFillCollateralizedConvertRequest = `CREATE OR REPLACE VIEW hafsql."VOFillCollateralizedConvertRequest"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body::jsonb -> 'value'::text) ->> 'requestid'::text AS requestid,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount_in'::text) AS amount_in_symbol,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount_out'::text) AS amount_out_symbol,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'excess_collateral'::text) AS excess_collateral,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'excess_collateral'::text) AS excess_collateral_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::fill_collateralized_convert_request_operation');`
  await pool.query(VOFillCollateralizedConvertRequest)

  // +33
  const VOSystemWarningOperation = `CREATE OR REPLACE VIEW hafsql."VOSystemWarningOperation"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'message'::text AS message
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::system_warning_operation');`
  await pool.query(VOSystemWarningOperation)

  // +34
  const VOFillRecurrentTransfer = `CREATE OR REPLACE VIEW hafsql."VOFillRecurrentTransfer"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body::jsonb -> 'value'::text) ->> 'to'::text AS to,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount'::text) AS amount,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount'::text) AS amount_symbol,
      (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
      (o.body::jsonb -> 'value'::text) ->> 'remaining_executions'::text AS remaining_executions
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::fill_recurrent_transfer_operation');`
  await pool.query(VOFillRecurrentTransfer)

  // +35
  const VOFailedRecurrentTransfer = `CREATE OR REPLACE VIEW hafsql."VOFailedRecurrentTransfer"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body::jsonb -> 'value'::text) ->> 'to'::text AS to,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount'::text) AS amount,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount'::text) AS amount_symbol,
      (o.body::jsonb -> 'value'::text) ->> 'memo'::text AS memo,
      (o.body::jsonb -> 'value'::text) ->> 'consecutive_failures'::text AS consecutive_failures,
      (o.body::jsonb -> 'value'::text) ->> 'remaining_executions'::text AS remaining_executions,
      (o.body::jsonb -> 'value'::text) ->> 'deleted'::text AS deleted
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::failed_recurrent_transfer_operation');`
  await pool.query(VOFailedRecurrentTransfer)

  // +36
  const VOLimitOrderCancelled = `CREATE OR REPLACE VIEW hafsql."VOLimitOrderCancelled"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'seller'::text AS seller,
      (o.body::jsonb -> 'value'::text) ->> 'orderid'::text AS orderid,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'amount_back'::text) AS amount_back,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'amount_back'::text) AS amount_back_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::limit_order_cancelled_operation');`
  await pool.query(VOLimitOrderCancelled)

  // +37
  const VOProducerMissed = `CREATE OR REPLACE VIEW hafsql."VOProducerMissed"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'producer'::text AS producer
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::producer_missed_operation');`
  await pool.query(VOProducerMissed)

  // +38
  const VOProposalFee = `CREATE OR REPLACE VIEW hafsql."VOProposalFee"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'creator'::text AS creator,
      (o.body::jsonb -> 'value'::text) ->> 'treasury'::text AS treasury,
      (o.body::jsonb -> 'value'::text) ->> 'proposal_id'::text AS proposal_id,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'fee'::text) AS fee,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'fee'::text) AS fee_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::proposal_fee_operation');`
  await pool.query(VOProposalFee)

  // +39
  const VOCollateralizedConvertImmediateConversion = `CREATE OR REPLACE VIEW hafsql."VOCollateralizedConvertImmediateConversion"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'owner'::text AS owner,
      (o.body::jsonb -> 'value'::text) ->> 'requestid'::text AS requestid,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_out'::text) AS hbd_out,
      hafsql_assetsymbol((o.body::jsonb -> 'value'::text) ->> 'hbd_out'::text) AS hbd_out_symbol
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::collateralized_convert_immediate_conversion_operation');`
  await pool.query(VOCollateralizedConvertImmediateConversion)

  // +40
  const VOEscrowApproved = `CREATE OR REPLACE VIEW hafsql."VOEscrowApproved"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body::jsonb -> 'value'::text) ->> 'to'::text AS to,
      (o.body::jsonb -> 'value'::text) ->> 'agent'::text AS agent,
      (o.body::jsonb -> 'value'::text) ->> 'escrow_id'::text AS escrow_id,
      (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS fee
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::escrow_approved_operation');`
  await pool.query(VOEscrowApproved)

  // +41
  const VOEscrowRejected = `CREATE OR REPLACE VIEW hafsql."VOEscrowRejected"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'from'::text AS from,
      (o.body::jsonb -> 'value'::text) ->> 'to'::text AS to,
      (o.body::jsonb -> 'value'::text) ->> 'agent'::text AS agent,
      (o.body::jsonb -> 'value'::text) ->> 'escrow_id'::text AS escrow_id,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hbd_amount'::text) AS hbd_amount,
      hafsql_assetamount((o.body::jsonb -> 'value'::text) ->> 'hive_amount'::text) AS hive_amount,
      (o.body::jsonb -> 'value'::text) ->> 'fee'::text AS fee
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::escrow_rejected_operation');`
  await pool.query(VOEscrowRejected)

  // +42
  const VOProxyCleared = `CREATE OR REPLACE VIEW hafsql."VOProxyCleared"
    AS SELECT o.id as op_id,
      o."timestamp",
      (o.body::jsonb -> 'value'::text) ->> 'account'::text AS account,
      (o.body::jsonb -> 'value'::text) ->> 'proxy'::text AS proxy
    FROM hive.operations o
    WHERE o.op_type_id = (SELECT ot.id FROM hive.operation_types ot WHERE ot.name = 'hive::protocol::proxy_cleared_operation');`
  await pool.query(VOProxyCleared)
}

export const removeVirtualOperationViews = async () => {
  const dropViews = `DROP VIEW IF EXISTS
    hafsql."VOFillConvertRequest",
    hafsql."VOAuthorReward",
    hafsql."VOCurationReward",
    hafsql."VOCommentReward",
    hafsql."VOLiquidityReward",
    hafsql."VOInterestOperation",
    hafsql."VOFillVestingWithdraw",
    hafsql."VOFillOrder",
    hafsql."VOShutdownWitness",
    hafsql."VOFillTransferFromSavings",
    hafsql."VOHardfork",
    hafsql."VOCommentPayoutUpdate",
    hafsql."VOReturnVestingDelegation",
    hafsql."VOCommentBenefactorReward",
    hafsql."VOProducerReward",
    hafsql."VOClearNullAccountBalance",
    hafsql."VOProposalPay",
    hafsql."VODHFFunding",
    hafsql."VOHardforkHive",
    hafsql."VOHardforkHiveRestore",
    hafsql."VODelayedVoting",
    hafsql."VOConsolidateTreasuryBalance",
    hafsql."VOEffectiveCommentVote",
    hafsql."VOIneffectiveDeleteComment",
    hafsql."VODHFConversion",
    hafsql."VOExpiredAccountNotification",
    hafsql."VOChangedRecoveryAccount",
    hafsql."VOTransferToVestingCompleted",
    hafsql."VOPowReward",
    hafsql."VOVestingSharesSplit",
    hafsql."VOAccountCreated",
    hafsql."VOFillCollateralizedConvertRequest",
    hafsql."VOSystemWarningOperation",
    hafsql."VOFillRecurrentTransfer",
    hafsql."VOFailedRecurrentTransfer",
    hafsql."VOLimitOrderCancelled",
    hafsql."VOProducerMissed",
    hafsql."VOProposalFee",
    hafsql."VOCollateralizedConvertImmediateConversion",
    hafsql."VOEscrowApproved",
    hafsql."VOEscrowRejected",
    hafsql."VOProxyCleared";`
  await pool.query(dropViews)
}

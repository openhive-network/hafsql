// The body of the operations as stored in the hive.operations table
// Returned from the body_binary::jsonb->value
// Usually the name of the params is important not their types

export interface VoteOperation {
  voter: string
  author: string
  weight: string
  permlink: string
}

export interface CommentOperation {
  author: string
  permlink: string
  parent_author: string
  parent_permlink: string
  title: string
  body: string
  json_metadata: string
}

export interface TransferOperation {
  from: string
  to: string
  amount: string
  memo: string
}

export interface TransferToVestingOperation {
  from: string
  to: string
  amount: string
}

export interface WithdrawVestingOperation {
  account: string
  vesting_shares: string
}

export interface LimitOrderCreateOperation {
  owner: string
  orderid: string
  amount_to_sell: string
  min_to_receive: string
  fill_or_kill: string
  expiration: string
}

export interface LimitOrderCancelOperation {
  owner: string
  orderid: string
}

export interface FeedPublishOperation {
  publisher: string
  exchange_rate: {
    base: string
    quote: string
  }
}

export interface ConvertOperation {
  owner: string
  requestid: string
  amount: string
}

export interface AccountCreateOperation {
  fee: string
  creator: string
  new_account_name: string
  owner: string
  active: string
  posting: string
  memo_key: string
  json_metadata: string
}

export interface AccountUpdateOperation {
  account: string
  owner: string
  active: string
  posting: string
  memo_key: string
  json_metadata: string
}

export interface WitnessUpdateOperation {
  owner: string
  url: string
  block_signing_key: string
  props: {
    hbd_interest_rate: number
    maximum_block_size: number
    account_creation_fee: string
  }
  fee: string
}

export interface AccountWitnessVoteOperation {
  account: string
  witness: string
  approve: string
}

export interface AccountWitnessProxyOperation {
  account: string
  proxy: string
}

export interface PowOperation {
  worker_account: string
  block_id: string
  nonce: string
  work: string
  props: string
}

export interface CustomOperation {
  required_auths: string[]
  id: string
  data: string
}

export interface DeleteCommentOperation {
  author: string
  permlink: string
}

export interface CustomJsonOperation {
  required_auths: string[]
  required_posting_auths: string[]
  id: string
  json: string
}

export interface CommentOptionsOperation {
  author: string
  permlink: string
  max_accepted_payout: string
  percent_hbd: string
  allow_votes: string
  allow_curation_rewards: string
  extensions: string
}

export interface SetWithdrawVestingRouteOperation {
  from_account: string
  to_account: string
  percent: string
  auto_vest: string
}

export interface LimitOrderCreate2Operation {
  owner: string
  orderid: string
  amount_to_sell: string
  exchange_rate: { base: string; quote: string }
  fill_or_kill: string
  expiration: string
}

export interface ClaimAccountOperation {
  creator: string
  fee: string
  extensions: string
}

export interface CreateClaimedAccountOperation {
  creator: string
  new_account_name: string
  owner: string
  active: string
  posting: string
  memo_key: string
  json_metadata: string
  extensions: string
}

export interface RequestAccountRecoveryOperation {
  recovery_account: string
  account_to_recover: string
  new_owner_authority: string
  extensions: string
}

export interface RecoverAccountOperation {
  account_to_recover: string
  new_owner_authority: string
  recent_owner_authority: string
  extensions: string
}

export interface ChangeRecoveryAccountOperation {
  account_to_recover: string
  new_recovery_account: string
  extensions: string
}

export interface EscrowTransferOperation {
  from: string
  to: string
  hbd_amount: string
  hive_amount: string
  escrow_id: string
  agent: string
  fee: string
  json_meta: string
  ratification_deadline: string
  escrow_expiration: string
}

export interface EscrowDisputeOperation {
  from: string
  to: string
  agent: string
  who: string
  escrow_id: string
}

export interface EscrowReleaseOperation {
  from: string
  to: string
  agent: string
  who: string
  receiver: string
  escrow_id: string
  hbd_amount: string
  hive_amount: string
}

export interface Pow2Operation {
  work: string
  props: string
}

export interface EscrowApproveOperation {
  from: string
  to: string
  agent: string
  who: string
  escrow_id: string
  approve: string
}

export interface TransferToSavingsOperation {
  from: string
  to: string
  amount: string
  memo: string
}

export interface TransferFromSavingsOperation {
  from: string
  to: string
  request_id: string
  amount: string
  memo: string
}

export interface CancelTransferFromSavingsOperation {
  from: string
  request_id: string
}

export interface DeclineVotingRightsOperation {
  account: string
  decline: string
}

export interface ClaimRewardBalanceOperation {
  account: string
  reward_hive: string
  reward_hbd: string
  reward_vests: string
}

export interface DelegateVestingSharesOperation {
  delegator: string
  delegatee: string
  vesting_shares: string
}

export interface AccountCreateWithDelegationOperation {
  creator: string
  new_account_name: string
  fee: string
  delegation: string
  owner: string
  active: string
  posting: string
  memo_key: string
  json_metadata: string
  extensions: string
}

export interface WitnessSetPropertiesOperations {
  owner: string
  props: string
  extensions: string
}

export interface AccountUpdate2Operation {
  account: string
  owner: string
  active: string
  posting: string
  memo_key: string
  json_metadata: string
  posting_json_metadata: string
  extensions: string
}

export interface CreateProposalOperation {
  creator: string
  receiver: string
  subject: string
  permlink: string
  start_date: string
  end_date: string
  daily_pay: string
  extensions: string
}

export interface UpdateProposalVotesOperation {
  voter: string
  proposal_ids: string
  approve: string
  extensions: string
}

export interface RemoveProposalOperation {
  proposal_owner: string
  proposal_ids: string
  extensions: string
}

export interface UpdateProposalOperation {
  proposal_id: string
  creator: string
  daily_pay: string
  subject: string
  permlink: string
  extensions: string
}

export interface CollateralizedConvertOperation {
  owner: string
  requestid: string
  amount: string
}

export interface RecurrentTransferOperation {
  from: string
  to: string
  amount: string
  memo: string
  recurrence: string
  executions: string
  extensions: string
}

// Virtual Operations

export interface FillConvertRequestOperation {
  owner: string
  requestid: string
  amount_in: string
  amount_out: string
}

export interface AuthorRewardOperation {
  author: string
  permlink: string
  hbd_payout: string
  hive_payout: string
  vesting_payout: string
  curators_vesting_payout: string
  payout_must_be_claimed: string
}

export interface CurationRewardOperation {
  curator: string
  reward: string
  author: string
  permlink: string
  payout_must_be_claimed: string
}

export interface CommentRewardOperation {
  author: string
  permlink: string
  payout: string
  author_rewards: string
  total_payout_value: string
  curator_payout_value: string
  beneficiary_payout_value: string
}

export interface LiquidityRewardOperation {
  owner: string
  payout: string
}

export interface InterestOperation {
  owner: string
  interest: string
  is_saved_into_hbd_balance: string
}

export interface FillVestingWithdrawOperation {
  from_account: string
  to_account: string
  withdrawn: string
  deposited: string
}

export interface FillOrderOperation {
  current_owner: string
  open_owner: string
  current_orderid: string
  open_orderid: string
  current_pays: string
  open_pays: string
}

export interface ShutdownWitnessOperation {
  owner: string
}

export interface FillTransferFromSavingsOperation {
  from: string
  to: string
  request_id: string
  memo: string
  amount: string
}

export interface HardforkOperation {
  hardfork_id: string
}

export interface CommentPayoutUpdateOperation {
  author: string
  permlink: string
}

export interface ReturnVestingDelegationOperation {
  account: string
  vesting_shares: string
}

export interface CommentBenefactorRewardOperation {
  benefactor: string
  author: string
  permlink: string
  hbd_payout: string
  hive_payout: string
  vesting_payout: string
  payout_must_be_claimed: string
}

export interface ProducerRewardOperation {
  producer: string
  vesting_shares: string
}

export interface ClearNullAccountBalanceOperation {
  total_cleared: string
}

export interface ProposalPayOperation {
  proposal_id: string
  receiver: string
  payer: string
  payment: string
}

export interface DhfFundingOperation {
  treasury: string
  additional_funds: string
}

export interface HardforkHiveOperation {
  account: string
  treasury: string
  other_affected_accounts: string
  hbd_transferred: string
  hive_transferred: string
  total_hive_from_vests: string
  vests_converted: string
}

export interface HardforkHiveRestoreOperation {
  account: string
  treasury: string
  hbd_transferred: string
  hive_transferred: string
}

export interface DelayedVotingOperation {
  voter: string
  votes: string
}

export interface ConsolidateTreasuryBalanceOperation {
  total_moved: string
}

export interface EffectiveCommentVoteOperation {
  voter: string
  author: string
  permlink: string
  weight: string
  rshares: string
  total_vote_weight: string
  pending_payout: string
}

export interface IneffectiveDeleteCommentOperation {
  author: string
  permlink: string
}

export interface DhfConversionOperation {
  treasury: string
  hive_amount_in: string
  hbd_amount_out: string
}

export interface ExpiredAccountNotificationOperation {
  account: string
}

export interface ChangedRecoveryAccountOperation {
  account: string
  old_recovery_account: string
  new_recovery_account: string
}

export interface TransferToVestingCompletedOperation {
  from_account: string
  to_account: string
  hive_vested: string
  vesting_shares_received: string
}

export interface PowRewardOperation {
  worker: string
  reward: string
}

export interface VestingSharesSplitOperation {
  owner: string
  vesting_shares_before_split: string
  vesting_shares_after_split: string
}

export interface AccountCreatedOperation {
  new_account_name: string
  creator: string
  initial_vesting_shares: string
  initial_delegation: string
}

export interface FillCollateralizedConvertRequestOperation {
  owner: string
  requestid: string
  amount_in: string
  amount_out: string
  excess_collateral: string
}

export interface SystemWarningOperation {
  message: string
}

export interface FillRecurrentTransferOperation {
  from: string
  to: string
  amount: string
  memo: string
  remaining_executions: string
  extensions: string
}

export interface FailedRecurrentTransferOperation {
  from: string
  to: string
  amount: string
  memo: string
  consecutive_failures: string
  remaining_executions: string
  deleted: string
  extensions: string
}

export interface LimitOrderCancelledOperation {
  seller: string
  orderid: string
  amount_back: string
}

export interface ProducerMissedOperation {
  producer: string
}

export interface ProposalFeeOperation {
  creator: string
  treasury: string
  proposal_id: string
  fee: string
}

export interface CollateralizedConvertImmediateConversionOperation {
  owner: string
  requestid: string
  hbd_out: string
}

export interface EscrowApprovedOperation {
  from: string
  to: string
  agent: string
  escrow_id: string
  fee: string
}

export interface EscrowRejectedOperation {
  from: string
  to: string
  agent: string
  escrow_id: string
  hbd_amount: string
  hive_amount: string
  fee: string
}

export interface ProxyClearedOperation {
  account: string
  proxy: string
}

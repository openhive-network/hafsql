import { opId } from './operation_id.ts'

export interface BlockRange {
	block_range: [number, number] | null
}

export interface CommentOp {
	op_id: bigint
	timestamp: string
	author: string
	permlink: string
	parent_author: string
	parent_permlink: string
	title: string
	body: string
	json_metadata: string
}
export interface CommentObj {
	id: number
	title: string
	body: string
	tags: string[]
	metadata: object
}

export interface CustomJson {
	op_id: bigint
	json: string
	required_posting_auths: string[]
	id: string
}

export interface ReblogsArray {
	account: number
	post: number
	remove: boolean
	op_id: bigint
}

export interface AuthorPermlink {
	author: string
	permlink: string
}

export interface DeletedComment extends AuthorPermlink {
	op_id: bigint
}

export interface EffectiveCommentVote extends AuthorPermlink {
	pending_payout: number
}

export interface PaidComments extends DeletedComment {
	payout: number
	author_rewards: number
	total_payout_value: number
	curator_payout_value: number
	beneficiary_payout_value: number
}

export interface RootAuthorPermlink {
	root_author: string
	root_permlink: string
}

export interface Delegations {
	delegator: string
	delegatee: string
	vesting_shares: string | number
	timestamp: string
}

export interface RcCustomJson {
	op_id: bigint
	json: string
}

export interface RcDelegationParams {
	from: string
	delegatees: string[]
	max_rc?: string | number
}

export interface RcDelegation {
	length: 2
	0: string | number
	1: RcDelegationParams
}

export interface RcDelegationAppended {
	from: string
	delegatees: string[]
	max_rc: string | number
}

export interface CustomJsonFollow {
	op_id: bigint
	json: string
	required_posting_auths: string[]
}

export interface Follows {
	follower: number
	following: number[]
	what: string[]
	op_id: bigint
}

export interface Operation {
	op_id: bigint
	op_type: string
	op_body: object
}
export interface ProposalApprovals {
	op_id: bigint
	voter: string
	proposal_ids: number[]
	approve: string
}

export interface ExpiredAccount {
	op_id: bigint
	account: string
}

export interface ApprovalsAndExpired {
	type: 'approval' | 'expired'
	op_id: bigint
	voter?: string
	proposal_ids?: number[]
	approve?: string
	account?: string
}

export interface CommunityJson {
	community: string
	account?: string
	role?: string
	title?: string
}

export interface Communities {
	type: string
	json: CommunityJson
	postingAuths: string[]
	op_id: bigint
}

export type CommunityRoles =
	| 'muted'
	| 'guest'
	| 'member'
	| 'mod'
	| 'admin'
	| 'owner'

export interface EffectiveCommentVoteREP {
	op_id: bigint
	voter: string
	author: string
	permlink: string
	rshares: string
	timestamp: string
}

export interface Reputation {
	account: number
	reputation: string
	is_implicit: boolean
}

export interface SyncData {
	table_name:
		| 'delegations'
		| 'rc_delegations'
		| 'proposal_approvals'
		| 'follows'
		| 'comments'
		| 'pending_rewards'
		| 'paid_rewards'
		| 'reblogs'
		| 'communities'
		| 'delete_comments'
		| 'reputations'
	last_block_num: number
}

export interface ImpactedBalances {
	account_name: string
	amount: bigint
	asset_precision: number
	asset_symbol_nai: number
	id: bigint
	block_num: number
	op_type_id: number
}

export interface HardforkHive {
	account: string
	hbd_transferred: string
	hive_transferred: string
	vests_converted: string
}

export interface BalancesOnly {
	hive: string
	hbd: string
	vests: string
	hive_savings: string
	hbd_savings: string
}

export interface Balances extends BalancesOnly {
	account: number
}

export interface BalancesFakeTable extends BalancesOnly {
	updated: boolean
}

export interface TransferToSavings {
	op_id: bigint
	from: string
	to: string
	amount: string
	symbol: 'hive' | 'hbd'
	block_num: number
}

export interface TransferFromSavings extends TransferToSavings {
	request_id: bigint
}

export interface CancelFromTransfer {
	op_id: bigint
	from: string
	request_id: bigint
	block_num: number
}

export interface FillFromTransfer extends CancelFromTransfer {}

export interface Interests {
	op_id: bigint
	owner: string
	interest: string
	block_num: number
}

export interface Savings {
	type:
		| 'transfer_to_savings'
		| 'transfer_from_savings'
		| 'cancel_transfer_from_savings'
		| 'fill_transfer_from_savings'
		| 'interest'
	op_id: bigint
	from?: string
	to?: string
	amount?: string
	symbol?: 'hive' | 'hbd'
	request_id?: bigint
	owner?: string
	interest?: string
	block_num: number
}

export interface PendingSavings {
	amount: string
	symbol: 'hive' | 'hbd'
}

export type AllSymbols =
	| 'hive'
	| 'hbd'
	| 'vests'
	| 'hive_savings'
	| 'hbd_savings'

export interface AccountCreated {
	new_account_name: string
	creator: string
	timestamp: string
	op_id: bigint
}
export interface AccountCreate {
	new_account_name: string
	owner: string
	active: string
	posting: string
	memo_key: string
	json_metadata: object
	op_id: bigint
}
export interface AccountUpdate {
	account: string
	owner: string
	active: string
	posting: string
	memo_key: string
	json_metadata: object
	timestamp: string
	op_id: bigint
}
export interface AccountUpdate2 {
	account: string
	json_metadata: object
	posting_json_metadata: object
	timestamp: string
	op_id: bigint
}
export interface WitnessProxy {
	account: string
	proxy: string
	op_id: bigint
}
export interface ChangedRecovery {
	account: string
	new_recovery_account: string
	timestamp: string
	op_id: bigint
}
export interface WithdrawRoute {
	from_account: string
	to_account: string
	percent: number
	auto_vest: boolean
	op_id: bigint
}
export interface RecoverAccount {
	account_to_recover: string
	new_owner_authority: string
	op_id: bigint
}
export interface Pow {
	worker_account: string
	worker: string
	op_id: bigint
}
export interface AuthorReward {
	account: string
	hbd_payout: string
	hive_payout: string
	vesting_payout: string
	op_id: bigint
}
export interface CurationReward {
	account: string
	reward: string
	op_id: bigint
}
export interface ClaimReward {
	account: string
	reward_hive: string
	reward_hbd: string
	reward_vests: string
	op_id: bigint
}
export interface WithdrawVesting {
	account: string
	vesting_shares: string
	timestamp: string
	op_id: bigint
}
export interface FillVestingWithdraw {
	account: string
	withdrawn: string
	timestamp: string
	op_id: bigint
}

export interface AccountsData {
	new_account_name?: string
	creator?: string
	timestamp?: string
	owner?: string
	active?: string
	posting?: string
	memo_key?: string
	json_metadata?: object
	posting_json_metadata?: object
	proxy?: string
	account?: string
	new_recovery_account?: string
	from_account?: string
	to_account?: string
	percent?: number
	auto_vest?: boolean
	account_to_recover?: string
	new_owner_authority?: string
	worker_account?: string
	worker?: string
	hbd_payout?: string
	hive_payout?: string
	vesting_payout?: string
	reward?: string
	reward_hive?: string
	reward_hbd?: string
	reward_vests?: string
	vesting_shares?: string
	withdrawn?: string
	op_id: bigint
	type:
		| 'account_created'
		| 'account_create'
		| 'account_update'
		| 'account_update2'
		| 'account_witness_proxy'
		| 'proxy_cleared'
		| 'changed_recovery_account'
		| 'set_withdraw_vesting_route'
		| 'recover_account'
		| 'pow'
		| 'author_reward'
		| 'curation_reward'
		| 'claim_reward'
		| 'withdraw_vesting'
		| 'fill_vesting_withdraw'
}

export type OperationNames = keyof typeof opId
// type OperationIds = typeof opId[OperationNames]

export interface Operations {
	id: bigint
	body: { type: string; value: object }
	op_type_id: number
	created_at: string
}

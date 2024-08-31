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
	type: string
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
}

export interface Balances {
	account: number
	hive: string
	hbd: string
	vests: string
}

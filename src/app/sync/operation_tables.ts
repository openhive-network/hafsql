import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { type OperationNames, type Operations } from '../helpers/types.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { getOpName, opId } from '../helpers/operation_id.ts'
import type {
	AccountCreatedOperation,
	AccountCreateOperation,
	AccountUpdateOperation,
	AccountWitnessProxyOperation,
	AccountWitnessVoteOperation,
	ChangedRecoveryAccountOperation,
	ChangeRecoveryAccountOperation,
	ClaimAccountOperation,
	CollateralizedConvertImmediateConversionOperation,
	CommentOperation,
	CommentOptionsOperation,
	ConsolidateTreasuryBalanceOperation,
	ConvertOperation,
	CreateClaimedAccountOperation,
	CustomJsonOperation,
	CustomOperation,
	DelayedVotingOperation,
	DeleteCommentOperation,
	DhfConversionOperation,
	EffectiveCommentVoteOperation,
	EscrowApprovedOperation,
	EscrowRejectedOperation,
	EscrowTransferOperation,
	ExpiredAccountNotificationOperation,
	FailedRecurrentTransferOperation,
	FeedPublishOperation,
	FillCollateralizedConvertRequestOperation,
	FillRecurrentTransferOperation,
	HardforkHiveRestoreOperation,
	IneffectiveDeleteCommentOperation,
	LimitOrderCancelledOperation,
	LimitOrderCancelOperation,
	LimitOrderCreate2Operation,
	LimitOrderCreateOperation,
	PowOperation,
	PowRewardOperation,
	ProducerMissedOperation,
	ProposalFeeOperation,
	ProxyClearedOperation,
	RecoverAccountOperation,
	RequestAccountRecoveryOperation,
	SetWithdrawVestingRouteOperation,
	SystemWarningOperation,
	TransferOperation,
	TransferToVestingCompletedOperation,
	TransferToVestingOperation,
	VestingSharesSplitOperation,
	VoteOperation,
	WithdrawVestingOperation,
	WitnessUpdateOperation,
} from '../helpers/operation_types.ts'
import type { EscrowDisputeOperation } from '../helpers/operation_types.ts'
import type { EscrowReleaseOperation } from '../helpers/operation_types.ts'
import type { Pow2Operation } from '../helpers/operation_types.ts'
import type { EscrowApproveOperation } from '../helpers/operation_types.ts'
import type { TransferToSavingsOperation } from '../helpers/operation_types.ts'
import type { TransferFromSavingsOperation } from '../helpers/operation_types.ts'
import type { CancelTransferFromSavingsOperation } from '../helpers/operation_types.ts'
import type { DeclineVotingRightsOperation } from '../helpers/operation_types.ts'
import type { ClaimRewardBalanceOperation } from '../helpers/operation_types.ts'
import type { DelegateVestingSharesOperation } from '../helpers/operation_types.ts'
import type { AccountCreateWithDelegationOperation } from '../helpers/operation_types.ts'
import type { WitnessSetPropertiesOperations } from '../helpers/operation_types.ts'
import type { AccountUpdate2Operation } from '../helpers/operation_types.ts'
import type { CreateProposalOperation } from '../helpers/operation_types.ts'
import type { UpdateProposalOperation } from '../helpers/operation_types.ts'
import type { UpdateProposalVotesOperation } from '../helpers/operation_types.ts'
import type { RemoveProposalOperation } from '../helpers/operation_types.ts'
import type { CollateralizedConvertOperation } from '../helpers/operation_types.ts'
import type { RecurrentTransferOperation } from '../helpers/operation_types.ts'
import type { FillConvertRequestOperation } from '../helpers/operation_types.ts'
import type { AuthorRewardOperation } from '../helpers/operation_types.ts'
import type { CurationRewardOperation } from '../helpers/operation_types.ts'
import type { CommentRewardOperation } from '../helpers/operation_types.ts'
import type { LiquidityRewardOperation } from '../helpers/operation_types.ts'
import type { InterestOperation } from '../helpers/operation_types.ts'
import type { FillVestingWithdrawOperation } from '../helpers/operation_types.ts'
import type { FillOrderOperation } from '../helpers/operation_types.ts'
import type { ShutdownWitnessOperation } from '../helpers/operation_types.ts'
import type { FillTransferFromSavingsOperation } from '../helpers/operation_types.ts'
import type { HardforkOperation } from '../helpers/operation_types.ts'
import type { CommentPayoutUpdateOperation } from '../helpers/operation_types.ts'
import type { ReturnVestingDelegationOperation } from '../helpers/operation_types.ts'
import type { CommentBenefactorRewardOperation } from '../helpers/operation_types.ts'
import type { ProducerRewardOperation } from '../helpers/operation_types.ts'
import type { ClearNullAccountBalanceOperation } from '../helpers/operation_types.ts'
import type { ProposalPayOperation } from '../helpers/operation_types.ts'
import type { DhfFundingOperation } from '../helpers/operation_types.ts'
import type { HardforkHiveOperation } from '../helpers/operation_types.ts'
import { createOperationIndexes } from '../indexes/hafsql.ts'
import { customClient, query, transaction } from '../helpers/database.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[Operation Tables] Start massive sync... ⏳')
			syncOperationTables()
		}
	}
}

let firstRun = true
const syncOperationTables = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillOperationTables()
		print('[Operation Tables] Massive sync done ✅')
		print('[Operation Tables] Creating indexes... ⏳')
		await createOperationIndexes()
		print('[Operation Tables] Indexes have been created ✅')
		print('[Operation Tables] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillOperationTables()
	await sleep(intervalTime)
	syncOperationTables()
}

export const fillOperationTables = async () => {
	let blockRange = await getBlockRange('operations', undefined, 10000)
	while (blockRange) {
		const data = await getData(blockRange)
		await processData(data, blockRange)
		blockRange = await getBlockRange('operations', undefined, 10000)
	}
}

const getData = async (blockRange: number[]) => {
	const result = await query<Operations>(
		`SELECT id, body_binary::jsonb AS body, hive.operation_id_to_type_id(id) AS op_type_id
      FROM hafd.operations
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      AND hive.operation_id_to_type_id(id) NOT IN
      (${opId.vote}, ${opId.comment}, ${opId.custom_json}, ${opId.effective_comment_vote})
      ORDER BY id ASC`,
		[blockRange[0], blockRange[1]],
	)
	return result.rows
}

const processData = async (
	data: Operations[],
	blockRange: number[],
) => {
	await transaction(async (client) => {
		const operations: Record<string, Operations[]> = {}
		const opNumbers = Object.keys(opId).length
		for (let i = 0; i < opNumbers; i++) {
			operations[i] = []
		}
		for (let i = 0; i < data.length; i++) {
			const { op_type_id } = data[i]
			operations[op_type_id].push(data[i])
		}
		await bulkInsertData(operations, client)
		await updateLastBlockNum('operations', blockRange[1], client)
	})
}

const bulkInsertData = async (
	operations: Record<string, Operations[]>,
	client: customClient,
) => {
	for (const op_type_id in operations) {
		const ops = operations[op_type_id]
		if (ops.length === 0) {
			continue
		}
		const op_name = <OperationNames> getOpName(Number(op_type_id))
		if (op_name === 'vote') {
			// 130GB storage used - non-compressed
			// await fillVote(ops, trx)
		} else if (op_name === 'comment') {
			// 121GB storage used - non-compressed
			// await fillComment(ops, trx)
		} else if (op_name === 'transfer') {
			await fillTransfer(ops, client)
		} else if (op_name === 'transfer_to_vesting') {
			await fillTransferToVesting(ops, client)
		} else if (op_name === 'withdraw_vesting') {
			await fillWithdrawVesting(ops, client)
		} else if (op_name === 'limit_order_create') {
			await fillLimitOrderCreate(ops, client)
		} else if (op_name === 'limit_order_cancel') {
			await fillLimitOrderCancel(ops, client)
		} else if (op_name === 'feed_publish') {
			await fillFeedPublished(ops, client)
		} else if (op_name === 'convert') {
			await fillConvert(ops, client)
		} else if (op_name === 'account_create') {
			await fillAccountCreate(ops, client)
		} else if (op_name === 'account_update') {
			await fillAccountUpdate(ops, client)
		} else if (op_name === 'witness_update') {
			await fillWitnessUpdate(ops, client)
		} else if (op_name === 'account_witness_vote') {
			await fillAccountWitnessVote(ops, client)
		} else if (op_name === 'account_witness_proxy') {
			await fillAccountWitnessProxy(ops, client)
		} else if (op_name === 'pow') {
			await fillPow(ops, client)
		} else if (op_name === 'custom') {
			await fillCustom(ops, client)
		} else if (op_name === 'delete_comment') {
			await fillDeleteComment(ops, client)
		} else if (op_name === 'custom_json') {
			// 672GB storage used - non-compressed
			// await fillCustomJson(ops, client)
		} else if (op_name === 'comment_options') {
			await fillCommentOptions(ops, client)
		} else if (op_name === 'set_withdraw_vesting_route') {
			await fillSetWithdrawVestingRoute(ops, client)
		} else if (op_name === 'limit_order_create2') {
			await fillLimitOrderCreate2(ops, client)
		} else if (op_name === 'claim_account') {
			await fillClaimAccount(ops, client)
		} else if (op_name === 'create_claimed_account') {
			await fillCreateClaimedAccount(ops, client)
		} else if (op_name === 'request_account_recovery') {
			await fillRequestAccountRecovery(ops, client)
		} else if (op_name === 'recover_account') {
			await fillRecoverAccount(ops, client)
		} else if (op_name === 'change_recovery_account') {
			await fillChangeRecoveryAccount(ops, client)
		} else if (op_name === 'escrow_transfer') {
			await fillEscrowTransfer(ops, client)
		} else if (op_name === 'escrow_dispute') {
			await fillEscrowDispute(ops, client)
		} else if (op_name === 'escrow_release') {
			await fillEscrowRelease(ops, client)
		} else if (op_name === 'pow2') {
			await fillPow2(ops, client)
		} else if (op_name === 'escrow_approve') {
			await fillEscrowApprove(ops, client)
		} else if (op_name === 'transfer_to_savings') {
			await fillTransferToSavings(ops, client)
		} else if (op_name === 'transfer_from_savings') {
			await fillTransferFromSavings(ops, client)
		} else if (op_name === 'cancel_transfer_from_savings') {
			await fillCancelTransferFromSavings(ops, client)
		} else if (op_name === 'decline_voting_rights') {
			await fillDeclineVotingRights(ops, client)
		} else if (op_name === 'claim_reward_balance') {
			await fillClaimRewardBalance(ops, client)
		} else if (op_name === 'delegate_vesting_shares') {
			await fillDelegateVestingShares(ops, client)
		} else if (op_name === 'account_create_with_delegation') {
			await fillAccountCreateWithDelegation(ops, client)
		} else if (op_name === 'witness_set_properties') {
			await fillWitnessSetProperties(ops, client)
		} else if (op_name === 'account_update2') {
			await fillAccountUpdate2(ops, client)
		} else if (op_name === 'create_proposal') {
			await fillCreateProposal(ops, client)
		} else if (op_name === 'update_proposal_votes') {
			await fillUpdateProposalVotes(ops, client)
		} else if (op_name === 'remove_proposal') {
			await fillRemoveProposal(ops, client)
		} else if (op_name === 'update_proposal') {
			await fillUpdateProposal(ops, client)
		} else if (op_name === 'collateralized_convert') {
			await fillCollateralizedConvert(ops, client)
		} else if (op_name === 'recurrent_transfer') {
			await fillRecurrentTransfer(ops, client)
		} else if (op_name === 'fill_convert_request') { // VOPs
			await fillFillConvertRequest(ops, client)
		} else if (op_name === 'author_reward') {
			await fillAuthorReward(ops, client)
		} else if (op_name === 'curation_reward') {
			await fillCurationReward(ops, client)
		} else if (op_name === 'comment_reward') {
			await fillCommentReward(ops, client)
		} else if (op_name === 'liquidity_reward') {
			await fillLiquidityReward(ops, client)
		} else if (op_name === 'interest') {
			await fillInterest(ops, client)
		} else if (op_name === 'fill_vesting_withdraw') {
			await fillFillVestingWithdraw(ops, client)
		} else if (op_name === 'fill_order') {
			await fillFillOrder(ops, client)
		} else if (op_name === 'shutdown_witness') {
			await fillShutdownWitness(ops, client)
		} else if (op_name === 'fill_transfer_from_savings') {
			await fillFillTransferFromSavings(ops, client)
		} else if (op_name === 'hardfork') {
			await fillHardfork(ops, client)
		} else if (op_name === 'comment_payout_update') {
			await fillCommentPayoutUpdate(ops, client)
		} else if (op_name === 'return_vesting_delegation') {
			await fillReturnVestingDelegation(ops, client)
		} else if (op_name === 'comment_benefactor_reward') {
			await fillCommentBenefactorReward(ops, client)
		} else if (op_name === 'producer_reward') {
			await fillProducerReward(ops, client)
		} else if (op_name === 'clear_null_account_balance') {
			await fillClearNullAccountBalance(ops, client)
		} else if (op_name === 'proposal_pay') {
			await fillProposalPay(ops, client)
		} else if (op_name === 'dhf_funding') {
			await fillDhfFunding(ops, client)
		} else if (op_name === 'hardfork_hive') {
			await fillHardforkHive(ops, client)
		} else if (op_name === 'hardfork_hive_restore') {
			await fillHardforkHiveRestore(ops, client)
		} else if (op_name === 'delayed_voting') {
			await fillDelayedVoting(ops, client)
		} else if (op_name === 'consolidate_treasury_balance') {
			await fillConsolidateTreasuryBalance(ops, client)
		} else if (op_name === 'effective_comment_vote') {
			// 159GB storage used - non-compressed
			// await fillEffectiveCommentVote(ops, client)
		} else if (op_name === 'ineffective_delete_comment') {
			await fillIneffectiveDeleteComment(ops, client)
		} else if (op_name === 'dhf_conversion') {
			await fillDhfConversion(ops, client)
		} else if (op_name === 'expired_account_notification') {
			await fillExpiredAccountNotification(ops, client)
		} else if (op_name === 'changed_recovery_account') {
			await fillChangedRecoveryAccount(ops, client)
		} else if (op_name === 'transfer_to_vesting_completed') {
			await fillTransferToVestingCompleted(ops, client)
		} else if (op_name === 'pow_reward') {
			await fillPowReward(ops, client)
		} else if (op_name === 'vesting_shares_split') {
			await fillVestingSharesSplit(ops, client)
		} else if (op_name === 'account_created') {
			await fillAccountCreated(ops, client)
		} else if (op_name === 'fill_collateralized_convert_request') {
			await fillFillCollateralizedConvertRequest(ops, client)
		} else if (op_name === 'system_warning') {
			await fillSystemWarning(ops, client)
		} else if (op_name === 'fill_recurrent_transfer') {
			await fillFillRcurrentTransfer(ops, client)
		} else if (op_name === 'failed_recurrent_transfer') {
			await fillFailedRecurrentTransfer(ops, client)
		} else if (op_name === 'limit_order_cancelled') {
			await fillLimitOrderCancelled(ops, client)
		} else if (op_name === 'producer_missed') {
			await fillProducerMissed(ops, client)
		} else if (op_name === 'proposal_fee') {
			await fillProposalFee(ops, client)
		} else if (op_name === 'collateralized_convert_immediate_conversion') {
			await fillCollateralizedConvertImmediateConversion(ops, client)
		} else if (op_name === 'escrow_approved') {
			await fillEscrowApproved(ops, client)
		} else if (op_name === 'escrow_rejected') {
			await fillEscrowRejected(ops, client)
		} else if (op_name === 'proxy_cleared') {
			await fillProxyCleared(ops, client)
		}
	}
}

/****************************/
// const fillVote = async (ops: Operations[], client: PoolClient) => {
//   const ids = []
//   const voters = []
//   const authors = []
//   const permlinks = []
//   const weights = []
//   for (let i = 0; i < ops.length; i++) {
//     const value = <VoteOperation> ops[i].body.value
//     voters.push(value.voter)
//     authors.push(value.author)
//     permlinks.push(value.permlink)
//     weights.push(value.weight)
//     ids.push(ops[i].id)
//   }
//   await trx
//     .queryObject`INSERT INTO hafsql.operation_vote_table (id, voter, author, permlink, weight)
//       SELECT UNNEST(${ids}::int8[]), UNNEST(${voters}::text[]),
//       UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[]), UNNEST(${weights}::int2[])
//       ON CONFLICT (id) DO NOTHING;`
// }

// const fillComment = async (ops: Operations[], client: PoolClient) => {
//   const ids = []
//   const authors = []
//   const permlinks = []
//   const parent_authors = []
//   const parent_permlinks = []
//   const titles = []
//   const bodys = []
//   const metadatas = []
//   for (let i = 0; i < ops.length; i++) {
//     const value = <CommentOperation> ops[i].body.value
//     authors.push(value.author)
//     permlinks.push(value.permlink)
//     parent_authors.push(value.parent_author)
//     parent_permlinks.push(value.parent_permlink)
//     titles.push(value.title)
//     bodys.push(value.body)
//     metadatas.push(value.json_metadata)
//     ids.push(ops[i].id)
//   }
//   await trx.queryObject`INSERT INTO hafsql.operation_comment_table
//     (id, author, permlink, parent_author, parent_permlink, title, body, json_metadata)
//     SELECT UNNEST(${ids}::int8[]), UNNEST(${authors}::text[]),
//     UNNEST(${permlinks}::text[]), UNNEST(${parent_authors}::text[]), UNNEST(${parent_permlinks}::text[]),
//     UNNEST(${titles}::text[]), UNNEST(${bodys}::text[]), hafsql.to_json(UNNEST(${metadatas}::text[]))
//     ON CONFLICT (id) DO NOTHING;`
// }

const fillTransfer = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const amounts = []
	const memos = []
	for (let i = 0; i < ops.length; i++) {
		const value = <TransferOperation> ops[i].body.value
		froms.push(value.from)
		tos.push(value.to)
		amounts.push(value.amount)
		memos.push(value.memo)
		ids.push(ops[i].id)
	}
	await client.query`INSERT INTO hafsql.operation_transfer_table
    (id, from_account, to_account, amount, symbol, memo)
    SELECT UNNEST(${ids}::int8[]), UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])), hafsql.asset_symbol(UNNEST(${amounts}::text[])), UNNEST(${memos}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillTransferToVesting = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const amounts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <TransferToVestingOperation> ops[i].body.value
		froms.push(value.from)
		tos.push(value.to)
		amounts.push(value.amount)
		ids.push(ops[i].id)
	}
	await client.query`INSERT INTO hafsql.operation_transfer_to_vesting_table
    (id, from_account, to_account, amount, symbol)
    SELECT UNNEST(${ids}::int8[]), UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])), hafsql.asset_symbol(UNNEST(${amounts}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillWithdrawVesting = async (ops: Operations[], client: customClient) => {
	const accounts = []
	const vests = []
	const ids = []
	for (let i = 0; i < ops.length; i++) {
		const value = <WithdrawVestingOperation> ops[i].body.value
		accounts.push(value.account)
		vests.push(value.vesting_shares)
		ids.push(ops[i].id)
	}
	await client.query`INSERT INTO hafsql.operation_withdraw_vesting_table
    (id, account, vesting_shares, symbol)
    SELECT UNNEST(${ids}::int8[]), UNNEST(${accounts}::text[]),
    hafsql.asset_amount(UNNEST(${vests}::text[])), hafsql.asset_symbol(UNNEST(${vests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillLimitOrderCreate = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const orderids = []
	const amounts = []
	const mins = []
	const fills = []
	const expires = []
	for (let i = 0; i < ops.length; i++) {
		const value = <LimitOrderCreateOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		orderids.push(value.orderid)
		amounts.push(value.amount_to_sell)
		mins.push(value.min_to_receive)
		fills.push(value.fill_or_kill)
		expires.push(value.expiration)
	}
	await client.query`INSERT INTO hafsql.operation_limit_order_create_table
    (id, owner, orderid, expiration, amount_to_sell, amount_to_sell_symbol,
      min_to_receive, min_to_receive_symbol, fill_or_kill)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]),
    UNNEST(${orderids}::int8[]), UNNEST(${expires}::timestamp[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    hafsql.asset_amount(UNNEST(${mins}::text[])),
    hafsql.asset_symbol(UNNEST(${mins}::text[])),
    UNNEST(${fills}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillLimitOrderCancel = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const orderids = []
	for (let i = 0; i < ops.length; i++) {
		const value = <LimitOrderCancelOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		orderids.push(value.orderid)
	}
	await client.query`INSERT INTO hafsql.operation_limit_order_cancel_table
    (id, owner, orderid)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${orderids}::int8[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillFeedPublished = async (ops: Operations[], client: customClient) => {
	const ids = []
	const publishers = []
	const bases = []
	const quotes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FeedPublishOperation> ops[i].body.value
		ids.push(ops[i].id)
		publishers.push(value.publisher)
		bases.push(value.exchange_rate.base)
		quotes.push(value.exchange_rate.quote)
	}
	await client.query`INSERT INTO hafsql.operation_feed_publish_table
    (id, publisher, exchange_rate_base_amount, exchange_rate_base_symbol,
      exchange_rate_quote_amount, exchange_rate_quote_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${publishers}::text[]),
    hafsql.asset_amount(UNNEST(${bases}::text[])),
    hafsql.asset_symbol(UNNEST(${bases}::text[])),
    hafsql.asset_amount(UNNEST(${quotes}::text[])),
    hafsql.asset_symbol(UNNEST(${quotes}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillConvert = async (ops: Operations[], client: customClient) => {
	const ids = []
	const owners = []
	const requestids = []
	const amounts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ConvertOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		requestids.push(value.requestid)
		amounts.push(value.amount)
	}
	await client.query`INSERT INTO hafsql.operation_convert_table
    (id, owner, requestid, amount, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${requestids}::int8[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountCreate = async (ops: Operations[], client: customClient) => {
	const ids = []
	const fees = []
	const creators = []
	const names = []
	const owners = []
	const actives = []
	const postings = []
	const memos = []
	const metadatas = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountCreateOperation> ops[i].body.value
		ids.push(ops[i].id)
		fees.push(value.fee)
		creators.push(value.creator)
		names.push(value.new_account_name)
		owners.push(value.owner)
		actives.push(value.active)
		postings.push(value.posting)
		memos.push(value.memo_key)
		metadatas.push(value.json_metadata)
	}
	await client.query`INSERT INTO hafsql.operation_account_create_table
    (id, fee, fee_symbol, creator, new_account_name, owner,
      active, posting, memo_key, json_metadata)
    SELECT UNNEST(${ids}::int8[]),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[])),
    UNNEST(${creators}::text[]), UNNEST(${names}::text[]), UNNEST(${owners}::jsonb[]),
    UNNEST(${actives}::jsonb[]), UNNEST(${postings}::jsonb[]), UNNEST(${memos}::text[]),
    hafsql.to_json(UNNEST(${metadatas}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountUpdate = async (ops: Operations[], client: customClient) => {
	const ids = []
	const accounts = []
	const owners = []
	const actives = []
	const postings = []
	const memos = []
	const metadatas = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountUpdateOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		owners.push(value.owner)
		actives.push(value.active)
		postings.push(value.posting)
		memos.push(value.memo_key)
		metadatas.push(value.json_metadata)
	}
	await client.query`INSERT INTO hafsql.operation_account_update_table
    (id, account, owner, active, posting, memo_key, json_metadata)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${owners}::jsonb[]),
    UNNEST(${actives}::jsonb[]), UNNEST(${postings}::jsonb[]),
    UNNEST(${memos}::text[]),
    hafsql.to_json(UNNEST(${metadatas}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillWitnessUpdate = async (ops: Operations[], client: customClient) => {
	const ids = []
	const owners = []
	const urls = []
	const keys = []
	const propsRates = []
	const propsSizes = []
	const propsFees = []
	const fees = []
	for (let i = 0; i < ops.length; i++) {
		const value = <WitnessUpdateOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		urls.push(value.url)
		keys.push(value.block_signing_key)
		propsRates.push(value.props.hbd_interest_rate)
		propsSizes.push(value.props.maximum_block_size)
		propsFees.push(value.props.account_creation_fee)
		fees.push(value.fee)
	}
	await client.query`INSERT INTO hafsql.operation_witness_update_table
    (id, owner, url, block_signing_key, props_hbd_interest_rate,
      props_maximum_block_size, props_account_creation_fee, props_account_creation_fee_symbol,
      fee, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${urls}::text[]), UNNEST(${keys}::text[]),
    UNNEST(${propsRates}::int4[]), UNNEST(${propsSizes}::int4[]),
    hafsql.asset_amount(UNNEST(${propsFees}::text[])),
    hafsql.asset_symbol(UNNEST(${propsFees}::text[])),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountWitnessVote = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const witnesses = []
	const approves = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountWitnessVoteOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		witnesses.push(value.witness)
		approves.push(value.approve)
	}
	await client.query`INSERT INTO hafsql.operation_account_witness_vote_table
    (id, account, witness, approve)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${witnesses}::text[]),
    UNNEST(${approves}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountWitnessProxy = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const proxys = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountWitnessProxyOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		proxys.push(value.proxy)
	}
	await client.query`INSERT INTO hafsql.operation_account_witness_proxy_table
    (id, account, proxy)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${proxys}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillPow = async (ops: Operations[], client: customClient) => {
	const ids = []
	const accounts = []
	const blockids = []
	const nonces = []
	const works = []
	const props = []
	for (let i = 0; i < ops.length; i++) {
		const value = <PowOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.worker_account)
		blockids.push(value.block_id)
		nonces.push(value.nonce)
		works.push(value.work)
		props.push(value.props)
	}
	await client.query`INSERT INTO hafsql.operation_pow_table
    (id, worker_account, block_id, nonce, work, props)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${blockids}::text[]), UNNEST(${nonces}::text[]),
    UNNEST(${works}::jsonb[]), UNNEST(${props}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCustom = async (ops: Operations[], client: customClient) => {
	const ids = []
	const auths = []
	const cids = []
	const datas = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CustomOperation> ops[i].body.value
		ids.push(ops[i].id)
		auths.push(JSON.stringify(value.required_auths))
		cids.push(value.id)
		datas.push(value.data)
	}
	await client.query`INSERT INTO hafsql.operation_custom_table
    (id, required_auths, custom_id, data)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${auths}::jsonb[]), UNNEST(${cids}::int8[]), UNNEST(${datas}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillDeleteComment = async (ops: Operations[], client: customClient) => {
	const ids = []
	const authors = []
	const permlinks = []
	for (let i = 0; i < ops.length; i++) {
		const value = <DeleteCommentOperation> ops[i].body.value
		ids.push(ops[i].id)
		authors.push(value.author)
		permlinks.push(value.permlink)
	}
	await client.query`INSERT INTO hafsql.operation_delete_comment_table
    (id, author, permlink)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

// const fillCustomJson = async (ops: Operations[], client: customClient) => {
//   const ids = []
//   const auths = []
//   const pauths = []
//   const cid = []
//   const jsons = []
//   for (let i = 0; i < ops.length; i++) {
//     const value = <CustomJsonOperation> ops[i].body.value
//     ids.push(ops[i].id)
//     auths.push(JSON.stringify(value.required_auths))
//     pauths.push(JSON.stringify(value.required_posting_auths))
//     cid.push(value.id)
//     jsons.push(value.json)
//   }
//   await client.query`INSERT INTO hafsql.operation_custom_json_table
//     (id, required_auths, required_posting_auths, custom_id, json)
//     SELECT UNNEST(${ids}::int8[]),
//     UNNEST(${auths}::jsonb[]), UNNEST(${pauths}::jsonb[]),
//     UNNEST(${cid}::text[]), hafsql.to_json(UNNEST(${jsons}::text[]))
//     ON CONFLICT (id) DO NOTHING;`
// }

const fillCommentOptions = async (ops: Operations[], client: customClient) => {
	const ids = []
	const authors = []
	const permlinks = []
	const maxpays = []
	const percents = []
	const allowVotes = []
	const allowCurations = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CommentOptionsOperation> ops[i].body.value
		ids.push(ops[i].id)
		authors.push(value.author)
		permlinks.push(value.permlink)
		maxpays.push(value.max_accepted_payout)
		percents.push(value.percent_hbd)
		allowVotes.push(value.allow_votes)
		allowCurations.push(value.allow_curation_rewards)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_comment_options_table
    (id, author, permlink, max_accepted_payout, max_accepted_payout_symbol,
      percent_hbd, allow_votes, allow_curation_rewards, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[]),
    hafsql.asset_amount(UNNEST(${maxpays}::text[])),
    hafsql.asset_symbol(UNNEST(${maxpays}::text[])),
    UNNEST(${percents}::int2[]), UNNEST(${allowVotes}::boolean[]),
    UNNEST(${allowCurations}::boolean[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillSetWithdrawVestingRoute = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const percents = []
	const autos = []
	for (let i = 0; i < ops.length; i++) {
		const value = <SetWithdrawVestingRouteOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from_account)
		tos.push(value.to_account)
		percents.push(value.percent)
		autos.push(value.auto_vest)
	}
	await client
		.query`INSERT INTO hafsql.operation_set_withdraw_vesting_route_table
    (id, from_account, to_account, percent, auto_vest)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${percents}::int2[]), UNNEST(${autos}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillLimitOrderCreate2 = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const orderids = []
	const amounts = []
	const ratesBase = []
	const ratesQuote = []
	const fills = []
	const expires = []
	for (let i = 0; i < ops.length; i++) {
		const value = <LimitOrderCreate2Operation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		orderids.push(value.orderid)
		amounts.push(value.amount_to_sell)
		ratesBase.push(value.exchange_rate.base)
		ratesQuote.push(value.exchange_rate.quote)
		fills.push(value.fill_or_kill)
		expires.push(value.expiration)
	}
	await client.query`INSERT INTO hafsql.operation_limit_order_create2_table
    (id, owner, orderid, amount_to_sell, amount_to_sell_symbol,
      exchange_rate_base, exchange_rate_base_symbol, exchange_rate_quote,
      exchange_rate_quote_symbol, fill_or_kill, expiration)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${orderids}::int8[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    hafsql.asset_amount(UNNEST(${ratesBase}::text[])),
    hafsql.asset_symbol(UNNEST(${ratesBase}::text[])),
    hafsql.asset_amount(UNNEST(${ratesQuote}::text[])),
    hafsql.asset_symbol(UNNEST(${ratesQuote}::text[])),
    UNNEST(${fills}::boolean[]), UNNEST(${expires}::timestamp[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillClaimAccount = async (ops: Operations[], client: customClient) => {
	const ids = []
	const creators = []
	const fees = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ClaimAccountOperation> ops[i].body.value
		ids.push(ops[i].id)
		creators.push(value.creator)
		fees.push(value.fee)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_claim_account_table
    (id, creator, fee, symbol, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${creators}::text[]),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[])),
    UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCreateClaimedAccount = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const creators = []
	const names = []
	const owners = []
	const actives = []
	const postings = []
	const memos = []
	const metadatas = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CreateClaimedAccountOperation> ops[i].body.value
		ids.push(ops[i].id)
		creators.push(value.creator)
		names.push(value.new_account_name)
		owners.push(value.owner)
		actives.push(value.active)
		postings.push(value.posting)
		memos.push(value.memo_key)
		metadatas.push(value.json_metadata)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_create_claimed_account_table
    (id, creator, new_account_name, owner, active, posting,
      memo_key, json_metadata, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${creators}::text[]), UNNEST(${names}::text[]),
    UNNEST(${owners}::jsonb[]), UNNEST(${actives}::jsonb[]),
    UNNEST(${postings}::jsonb[]), UNNEST(${memos}::text[]),
    hafsql.to_json(UNNEST(${metadatas}::text[])),
    UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillRequestAccountRecovery = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const recovers = []
	const accounts = []
	const owners = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <RequestAccountRecoveryOperation> ops[i].body.value
		ids.push(ops[i].id)
		recovers.push(value.recovery_account)
		accounts.push(value.account_to_recover)
		owners.push(value.new_owner_authority)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_request_account_recovery_table
    (id, recovery_account, account_to_recover, new_owner_authority, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${recovers}::text[]), UNNEST(${accounts}::text[]),
    UNNEST(${owners}::jsonb[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillRecoverAccount = async (ops: Operations[], client: customClient) => {
	const ids = []
	const accounts = []
	const newOwners = []
	const oldOwners = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <RecoverAccountOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account_to_recover)
		newOwners.push(value.new_owner_authority)
		oldOwners.push(value.recent_owner_authority)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_recover_account_table
    (id, account_to_recover, new_owner_authority, recent_owner_authority, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${newOwners}::jsonb[]),
    UNNEST(${oldOwners}::jsonb[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillChangeRecoveryAccount = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const recoverys = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ChangeRecoveryAccountOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account_to_recover)
		recoverys.push(value.new_recovery_account)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_change_recovery_account_table
    (id, account_to_recover, new_recovery_account, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${recoverys}::text[]),
    UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillEscrowTransfer = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const hbds = []
	const hives = []
	const eids = []
	const agents = []
	const fees = []
	const metadatas = []
	const deadlines = []
	const expires = []
	for (let i = 0; i < ops.length; i++) {
		const value = <EscrowTransferOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		hbds.push(value.hbd_amount)
		hives.push(value.hive_amount)
		eids.push(value.escrow_id)
		agents.push(value.agent)
		fees.push(value.fee)
		metadatas.push(value.json_meta)
		deadlines.push(value.ratification_deadline)
		expires.push(value.escrow_expiration)
	}
	await client.query`INSERT INTO hafsql.operation_escrow_transfer_table
    (id, from_account, to_account, hbd_amount, hive_amount, escrow_id, agent,
      fee, fee_symbol, json_meta, ratification_deadline, escrow_expiration)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    UNNEST(${eids}::int8[]), UNNEST(${agents}::text[]),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[])),
    hafsql.to_json(UNNEST(${metadatas}::text[])),
    UNNEST(${deadlines}::timestamp[]), UNNEST(${expires}::timestamp[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillEscrowDispute = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const agents = []
	const whos = []
	const eids = []
	for (let i = 0; i < ops.length; i++) {
		const value = <EscrowDisputeOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		agents.push(value.agent)
		whos.push(value.who)
		eids.push(value.escrow_id)
	}
	await client.query`INSERT INTO hafsql.operation_escrow_dispute_table
    (id, from_account, to_account, agent, who, escrow_id)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${agents}::text[]), UNNEST(${whos}::text[]),
    UNNEST(${eids}::int8[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillEscrowRelease = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const agents = []
	const whos = []
	const receivers = []
	const eids = []
	const hbds = []
	const hives = []
	for (let i = 0; i < ops.length; i++) {
		const value = <EscrowReleaseOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		agents.push(value.agent)
		whos.push(value.who)
		receivers.push(value.receiver)
		eids.push(value.escrow_id)
		hbds.push(value.hbd_amount)
		hives.push(value.hive_amount)
	}
	await client.query`INSERT INTO hafsql.operation_escrow_release_table
    (id, from_account, to_account, agent, who, receiver,
      escrow_id, hbd_amount, hive_amount)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${agents}::text[]), UNNEST(${whos}::text[]),
    UNNEST(${receivers}::text[]), UNNEST(${eids}::int8[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${hives}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillPow2 = async (ops: Operations[], client: customClient) => {
	const ids = []
	const works = []
	const props = []
	for (let i = 0; i < ops.length; i++) {
		const value = <Pow2Operation> ops[i].body.value
		ids.push(ops[i].id)
		works.push(value.work)
		props.push(value.props)
	}
	await client.query`INSERT INTO hafsql.operation_pow2_table
    (id, work, props)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${works}::jsonb[]), UNNEST(${props}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillEscrowApprove = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const agents = []
	const whos = []
	const eids = []
	const approves = []
	for (let i = 0; i < ops.length; i++) {
		const value = <EscrowApproveOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		agents.push(value.agent)
		whos.push(value.who)
		eids.push(value.escrow_id)
		approves.push(value.approve)
	}
	await client.query`INSERT INTO hafsql.operation_escrow_approve_table
    (id, from_account, to_account, agent, who, escrow_id, approve)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${agents}::text[]), UNNEST(${whos}::text[]),
    UNNEST(${eids}::int8[]), UNNEST(${approves}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillTransferToSavings = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const amounts = []
	const memos = []
	for (let i = 0; i < ops.length; i++) {
		const value = <TransferToSavingsOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		amounts.push(value.amount)
		memos.push(value.memo)
	}
	await client.query`INSERT INTO hafsql.operation_transfer_to_savings_table
    (id, from_account, to_account, amount, symbol, memo)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    UNNEST(${memos}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillTransferFromSavings = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const reqids = []
	const amounts = []
	const memos = []
	for (let i = 0; i < ops.length; i++) {
		const value = <TransferFromSavingsOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		reqids.push(value.request_id)
		amounts.push(value.amount)
		memos.push(value.memo)
	}
	await client.query`INSERT INTO hafsql.operation_transfer_from_savings_table
    (id, from_account, to_account, request_id, amount, symbol, memo)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]), UNNEST(${reqids}::int8[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    UNNEST(${memos}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCancelTransferFromSavings = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const reqids = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CancelTransferFromSavingsOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		reqids.push(value.request_id)
	}
	await client
		.query`INSERT INTO hafsql.operation_cancel_transfer_from_savings_table
    (id, from_account, request_id)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${reqids}::int8[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillDeclineVotingRights = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const declines = []
	for (let i = 0; i < ops.length; i++) {
		const value = <DeclineVotingRightsOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		declines.push(value.decline)
	}
	await client.query`INSERT INTO hafsql.operation_decline_voting_rights_table
    (id, account, decline)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${declines}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillClaimRewardBalance = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const hives = []
	const hbds = []
	const vests = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ClaimRewardBalanceOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		hives.push(value.reward_hive)
		hbds.push(value.reward_hbd)
		vests.push(value.reward_vests)
	}
	await client.query`INSERT INTO hafsql.operation_claim_reward_balance_table
    (id, account, reward_hive, reward_hbd, reward_vests)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${vests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillDelegateVestingShares = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const delegators = []
	const delegatees = []
	const vests = []
	for (let i = 0; i < ops.length; i++) {
		const value = <DelegateVestingSharesOperation> ops[i].body.value
		ids.push(ops[i].id)
		delegators.push(value.delegator)
		delegatees.push(value.delegatee)
		vests.push(value.vesting_shares)
	}
	await client.query`INSERT INTO hafsql.operation_delegate_vesting_shares_table
    (id, delegator, delegatee, vesting_shares)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${delegators}::text[]), UNNEST(${delegatees}::text[]),
    hafsql.asset_amount(UNNEST(${vests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountCreateWithDelegation = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const creators = []
	const names = []
	const fees = []
	const delegations = []
	const owners = []
	const actives = []
	const postings = []
	const memos = []
	const metadatas = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountCreateWithDelegationOperation> ops[i].body.value
		ids.push(ops[i].id)
		creators.push(value.creator)
		names.push(value.new_account_name)
		fees.push(value.fee)
		delegations.push(value.delegation)
		owners.push(value.owner)
		actives.push(value.active)
		postings.push(value.posting)
		memos.push(value.memo_key)
		metadatas.push(value.json_metadata)
		exes.push(JSON.stringify(value.extensions))
	}
	await client
		.query`INSERT INTO hafsql.operation_account_create_with_delegation_table
    (id, creator, new_account_name, fee, fee_symbol, delegation, owner,
      active, posting, memo_key, json_metadata, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${creators}::text[]), UNNEST(${names}::text[]),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[])),
    hafsql.asset_amount(UNNEST(${delegations}::text[])),
    UNNEST(${owners}::jsonb[]), UNNEST(${actives}::jsonb[]),
    UNNEST(${postings}::jsonb[]), UNNEST(${memos}::text[]),
    hafsql.to_json(UNNEST(${metadatas}::text[])), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillWitnessSetProperties = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const props = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <WitnessSetPropertiesOperations> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		props.push(JSON.stringify(value.props))
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_witness_set_properties_table
    (id, owner, props, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${props}::jsonb[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountUpdate2 = async (ops: Operations[], client: customClient) => {
	const ids = []
	const accounts = []
	const metadatas = []
	const postingMetadatas = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountUpdate2Operation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		metadatas.push(value.json_metadata)
		postingMetadatas.push(value.posting_json_metadata)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_account_update2_table
    (id, account, json_metadata, posting_json_metadata, extensions)
    SELECT UNNEST(${ids}::int8[]), UNNEST(${accounts}::text[]),
    hafsql.to_json(UNNEST(${metadatas}::text[])),
    hafsql.to_json(UNNEST(${postingMetadatas}::text[])),
    UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCreateProposal = async (ops: Operations[], client: customClient) => {
	const ids = []
	const creators = []
	const receivers = []
	const subjects = []
	const permlinks = []
	const starts = []
	const ends = []
	const pays = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CreateProposalOperation> ops[i].body.value
		ids.push(ops[i].id)
		creators.push(value.creator)
		receivers.push(value.receiver)
		subjects.push(value.subject)
		permlinks.push(value.permlink)
		starts.push(value.start_date)
		ends.push(value.end_date)
		pays.push(value.daily_pay)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_create_proposal_table
    (id, creator, receiver, subject, permlink, start_date, end_date,
      daily_pay, daily_pay_symbol, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${creators}::text[]), UNNEST(${receivers}::text[]),
    UNNEST(${subjects}::text[]), UNNEST(${permlinks}::text[]),
    UNNEST(${starts}::timestamp[]), UNNEST(${ends}::timestamp[]),
    hafsql.asset_amount(UNNEST(${pays}::text[])),
    hafsql.asset_symbol(UNNEST(${pays}::text[])),
    UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillUpdateProposalVotes = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const pids = []
	const voters = []
	const approves = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <UpdateProposalVotesOperation> ops[i].body.value
		ids.push(ops[i].id)
		voters.push(value.voter)
		pids.push(JSON.stringify(value.proposal_ids))
		approves.push(value.approve)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_update_proposal_votes_table
    (id, voter, proposal_ids, approve, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${voters}::text[]), UNNEST(${pids}::jsonb[]),
    UNNEST(${approves}::boolean[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillRemoveProposal = async (ops: Operations[], client: customClient) => {
	const ids = []
	const owners = []
	const pids = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <RemoveProposalOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.proposal_owner)
		pids.push(JSON.stringify(value.proposal_ids))
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_remove_proposal_table
    (id, proposal_owner, proposal_ids, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${pids}::jsonb[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillUpdateProposal = async (ops: Operations[], client: customClient) => {
	const ids = []
	const pids = []
	const creators = []
	const pays = []
	const subjects = []
	const permlinks = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <UpdateProposalOperation> ops[i].body.value
		ids.push(ops[i].id)
		pids.push(JSON.stringify(value.proposal_id))
		creators.push(value.creator)
		pays.push(value.daily_pay)
		subjects.push(value.subject)
		permlinks.push(value.permlink)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_update_proposal_table
    (id, proposal_id, creator, daily_pay, daily_pay_symbol,
      subject, permlink, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${pids}::int2[]), UNNEST(${creators}::text[]),
    hafsql.asset_amount(UNNEST(${pays}::text[])),
    hafsql.asset_symbol(UNNEST(${pays}::text[])),
    UNNEST(${subjects}::text[]), UNNEST(${permlinks}::text[]),
    UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCollateralizedConvert = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const rids = []
	const amounts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CollateralizedConvertOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		rids.push(value.requestid)
		amounts.push(value.amount)
	}
	await client.query`INSERT INTO hafsql.operation_collateralized_convert_table
    (id, owner, requestid, amount, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${rids}::int8[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillRecurrentTransfer = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const amounts = []
	const memos = []
	const recurs = []
	const execs = []
	const exes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <RecurrentTransferOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		amounts.push(value.amount)
		memos.push(value.memo)
		recurs.push(value.recurrence)
		execs.push(value.executions)
		exes.push(JSON.stringify(value.extensions))
	}
	await client.query`INSERT INTO hafsql.operation_recurrent_transfer_table
    (id, from_account, to_account, amount, symbol, memo,
      recurrence, executions, extensions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    UNNEST(${memos}::text[]), UNNEST(${recurs}::int2[]),
    UNNEST(${execs}::int2[]), UNNEST(${exes}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

// Virtual Operations

const fillFillConvertRequest = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const rids = []
	const ins = []
	const outs = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FillConvertRequestOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		rids.push(value.requestid)
		ins.push(value.amount_in)
		outs.push(value.amount_out)
	}
	await client.query`INSERT INTO hafsql.operation_fill_convert_request_table
    (id, owner, requestid, amount_in, amount_in_symbol,
      amount_out, amount_out_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${rids}::int8[]),
    hafsql.asset_amount(UNNEST(${ins}::text[])),
    hafsql.asset_symbol(UNNEST(${ins}::text[])),
    hafsql.asset_amount(UNNEST(${outs}::text[])),
    hafsql.asset_symbol(UNNEST(${outs}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillAuthorReward = async (ops: Operations[], client: customClient) => {
	const ids = []
	const authors = []
	const permlinks = []
	const hbds = []
	const hives = []
	const vests = []
	const curatorPays = []
	const claimed = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AuthorRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		authors.push(value.author)
		permlinks.push(value.permlink)
		hbds.push(value.hbd_payout)
		hives.push(value.hive_payout)
		vests.push(value.vesting_payout)
		curatorPays.push(value.curators_vesting_payout)
		claimed.push(value.payout_must_be_claimed)
	}
	await client.query`INSERT INTO hafsql.operation_author_reward_table
    (id, author, permlink, hbd_payout, hive_payout, vesting_payout,
      curators_vesting_payout, payout_must_be_claimed)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${vests}::text[])),
    hafsql.asset_amount(UNNEST(${curatorPays}::text[])),
    UNNEST(${claimed}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCurationReward = async (ops: Operations[], client: customClient) => {
	const ids = []
	const curators = []
	const rewards = []
	const authors = []
	const permlinks = []
	const claimed = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CurationRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		curators.push(value.curator)
		rewards.push(value.reward)
		authors.push(value.author)
		permlinks.push(value.permlink)
		claimed.push(value.payout_must_be_claimed)
	}
	await client.query`INSERT INTO hafsql.operation_curation_reward_table
    (id, curator, reward, symbol, author, permlink, payout_must_be_claimed)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${curators}::text[]),
    hafsql.asset_amount(UNNEST(${rewards}::text[])),
    hafsql.asset_symbol(UNNEST(${rewards}::text[])),
    UNNEST(${authors}::text[]),
    UNNEST(${permlinks}::text[]),
    UNNEST(${claimed}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCommentReward = async (ops: Operations[], client: customClient) => {
	const ids = []
	const authors = []
	const permlinks = []
	const payouts = []
	const authorRewards = []
	const totalPayouts = []
	const curatorPays = []
	const beneficiaries = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CommentRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		authors.push(value.author)
		permlinks.push(value.permlink)
		payouts.push(value.payout)
		authorRewards.push(value.author_rewards)
		totalPayouts.push(value.total_payout_value)
		curatorPays.push(value.curator_payout_value)
		beneficiaries.push(value.beneficiary_payout_value)
	}
	await client.query`INSERT INTO hafsql.operation_comment_reward_table
    (id, author, permlink, payout, author_rewards, total_payout_value,
      curator_payout_value, beneficiary_payout_value)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[]),
    hafsql.asset_amount(UNNEST(${payouts}::text[])),
    UNNEST(${authorRewards}::numeric[]) / 1000,
    hafsql.asset_amount(UNNEST(${totalPayouts}::text[])),
    hafsql.asset_amount(UNNEST(${curatorPays}::text[])),
    hafsql.asset_amount(UNNEST(${beneficiaries}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillLiquidityReward = async (ops: Operations[], client: customClient) => {
	const ids = []
	const owners = []
	const payouts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <LiquidityRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		payouts.push(value.payout)
	}
	await client.query`INSERT INTO hafsql.operation_liquidity_reward_table
    (id, owner, payout, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]),
    hafsql.asset_amount(UNNEST(${payouts}::text[])),
    hafsql.asset_symbol(UNNEST(${payouts}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillInterest = async (ops: Operations[], client: customClient) => {
	const ids = []
	const owners = []
	const interests = []
	const isBalances = []
	for (let i = 0; i < ops.length; i++) {
		const value = <InterestOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		interests.push(value.interest)
		isBalances.push(value.is_saved_into_hbd_balance)
	}
	await client.query`INSERT INTO hafsql.operation_interest_table
    (id, owner, interest, interest_symbol, is_saved_into_hbd_balance)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]),
    hafsql.asset_amount(UNNEST(${interests}::text[])),
    hafsql.asset_symbol(UNNEST(${interests}::text[])),
    UNNEST(${isBalances}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillFillVestingWithdraw = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const withdraws = []
	const deposits = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FillVestingWithdrawOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from_account)
		tos.push(value.to_account)
		withdraws.push(value.withdrawn)
		deposits.push(value.deposited)
	}
	await client.query`INSERT INTO hafsql.operation_fill_vesting_withdraw_table
    (id, from_account, to_account, withdrawn, withdrawn_symbol,
      deposited, deposited_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${withdraws}::text[])),
    hafsql.asset_symbol(UNNEST(${withdraws}::text[])),
    hafsql.asset_amount(UNNEST(${deposits}::text[])),
    hafsql.asset_symbol(UNNEST(${deposits}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillFillOrder = async (ops: Operations[], client: customClient) => {
	const ids = []
	const cowners = []
	const oowners = []
	const cids = []
	const oids = []
	const cpays = []
	const opays = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FillOrderOperation> ops[i].body.value
		ids.push(ops[i].id)
		cowners.push(value.current_owner)
		oowners.push(value.open_owner)
		cids.push(value.current_orderid)
		oids.push(value.open_orderid)
		cpays.push(value.current_pays)
		opays.push(value.open_pays)
	}
	await client.query`INSERT INTO hafsql.operation_fill_order_table
    (id, current_owner, open_owner, current_orderid, open_orderid,
      current_pays, current_pays_symbol, open_pays, open_pays_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${cowners}::text[]), UNNEST(${oowners}::text[]),
    UNNEST(${cids}::int8[]), UNNEST(${oids}::int8[]),
    hafsql.asset_amount(UNNEST(${cpays}::text[])),
    hafsql.asset_symbol(UNNEST(${cpays}::text[])),
    hafsql.asset_amount(UNNEST(${opays}::text[])),
    hafsql.asset_symbol(UNNEST(${opays}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillShutdownWitness = async (ops: Operations[], client: customClient) => {
	const ids = []
	const owners = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ShutdownWitnessOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
	}
	await client.query`INSERT INTO hafsql.operation_shutdown_witness_table
    (id, owner)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillFillTransferFromSavings = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const rids = []
	const memos = []
	const amounts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FillTransferFromSavingsOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		rids.push(value.request_id)
		memos.push(value.memo)
		amounts.push(value.amount)
	}
	await client
		.query`INSERT INTO hafsql.operation_fill_transfer_from_savings_table
    (id, from_account, to_account, request_id, memo, amount, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${rids}::int8[]), UNNEST(${memos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillHardfork = async (ops: Operations[], client: customClient) => {
	const ids = []
	const hids = []
	for (let i = 0; i < ops.length; i++) {
		const value = <HardforkOperation> ops[i].body.value
		ids.push(ops[i].id)
		hids.push(value.hardfork_id)
	}
	await client.query`INSERT INTO hafsql.operation_hardfork_table
    (id, hardfork_id)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${hids}::int2[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillCommentPayoutUpdate = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const authors = []
	const permlinks = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CommentPayoutUpdateOperation> ops[i].body.value
		ids.push(ops[i].id)
		authors.push(value.author)
		permlinks.push(value.permlink)
	}
	await client.query`INSERT INTO hafsql.operation_comment_payout_update_table
    (id, author, permlink)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillReturnVestingDelegation = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const vests = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ReturnVestingDelegationOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		vests.push(value.vesting_shares)
	}
	await client
		.query`INSERT INTO hafsql.operation_return_vesting_delegation_table
    (id, account, vesting_shares)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]),
    hafsql.asset_amount(UNNEST(${vests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillCommentBenefactorReward = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const benefactors = []
	const authors = []
	const permlinks = []
	const hbds = []
	const hives = []
	const vests = []
	const claimed = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CommentBenefactorRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		benefactors.push(value.benefactor)
		authors.push(value.author)
		permlinks.push(value.permlink)
		hbds.push(value.hbd_payout)
		hives.push(value.hive_payout)
		vests.push(value.vesting_payout)
		claimed.push(value.payout_must_be_claimed)
	}
	await client
		.query`INSERT INTO hafsql.operation_comment_benefactor_reward_table
    (id, benefactor, author, permlink, hbd_payout, hive_payout,
      vesting_payout, payout_must_be_claimed)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${benefactors}::text[]), UNNEST(${authors}::text[]),
    UNNEST(${permlinks}::text[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${vests}::text[])),
    UNNEST(${claimed}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillProducerReward = async (ops: Operations[], client: customClient) => {
	const ids = []
	const producers = []
	const vests = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ProducerRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		producers.push(value.producer)
		vests.push(value.vesting_shares)
	}
	await client.query`INSERT INTO hafsql.operation_producer_reward_table
    (id, producer, vesting_shares, vesting_shares_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${producers}::text[]),
    hafsql.asset_amount(UNNEST(${vests}::text[])),
    hafsql.asset_symbol(UNNEST(${vests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillClearNullAccountBalance = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const cleared = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ClearNullAccountBalanceOperation> ops[i].body.value
		ids.push(ops[i].id)
		cleared.push(JSON.stringify(value.total_cleared))
	}
	await client
		.query`INSERT INTO hafsql.operation_clear_null_account_balance_table
    (id, total_cleared)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${cleared}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillProposalPay = async (ops: Operations[], client: customClient) => {
	const ids = []
	const pids = []
	const receivers = []
	const payers = []
	const payments = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ProposalPayOperation> ops[i].body.value
		ids.push(ops[i].id)
		pids.push(value.proposal_id)
		receivers.push(value.receiver)
		payers.push(value.payer)
		payments.push(value.payment)
	}
	await client.query`INSERT INTO hafsql.operation_proposal_pay_table
    (id, proposal_id, receiver, payer, payment, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${pids}::int2[]), UNNEST(${receivers}::text[]),
    UNNEST(${payers}::text[]),
    hafsql.asset_amount(UNNEST(${payments}::text[])),
    hafsql.asset_symbol(UNNEST(${payments}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillDhfFunding = async (ops: Operations[], client: customClient) => {
	const ids = []
	const treasurys = []
	const funds = []
	for (let i = 0; i < ops.length; i++) {
		const value = <DhfFundingOperation> ops[i].body.value
		ids.push(ops[i].id)
		treasurys.push(value.treasury)
		funds.push(value.additional_funds)
	}
	await client.query`INSERT INTO hafsql.operation_dhf_funding_table
    (id, treasury, additional_funds, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${treasurys}::text[]),
    hafsql.asset_amount(UNNEST(${funds}::text[])),
    hafsql.asset_symbol(UNNEST(${funds}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillHardforkHive = async (ops: Operations[], client: customClient) => {
	const ids = []
	const accounts = []
	const treasurys = []
	const otherAccounts = []
	const hbds = []
	const hives = []
	const hivesFromVests = []
	const vests = []
	for (let i = 0; i < ops.length; i++) {
		const value = <HardforkHiveOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		treasurys.push(value.treasury)
		otherAccounts.push(JSON.stringify(value.other_affected_accounts))
		hbds.push(value.hbd_transferred)
		hives.push(value.hive_transferred)
		hivesFromVests.push(value.total_hive_from_vests)
		vests.push(value.vests_converted)
	}
	await client.query`INSERT INTO hafsql.operation_hardfork_hive_table
    (id, account, treasury, other_affected_accounts, hive_transferred,
      hbd_transferred, vests_converted, total_hive_from_vests)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${treasurys}::text[]),
    UNNEST(${otherAccounts}::jsonb[]),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${vests}::text[])),
    hafsql.asset_amount(UNNEST(${hivesFromVests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillHardforkHiveRestore = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const treasurys = []
	const hbds = []
	const hives = []
	for (let i = 0; i < ops.length; i++) {
		const value = <HardforkHiveRestoreOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		treasurys.push(value.treasury)
		hbds.push(value.hbd_transferred)
		hives.push(value.hive_transferred)
	}
	await client.query`INSERT INTO hafsql.operation_hardfork_hive_restore_table
    (id, account, treasury, hbd_transferred, hive_transferred)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${treasurys}::text[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${hives}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillDelayedVoting = async (ops: Operations[], client: customClient) => {
	const ids = []
	const voters = []
	const votes = []
	for (let i = 0; i < ops.length; i++) {
		const value = <DelayedVotingOperation> ops[i].body.value
		ids.push(ops[i].id)
		voters.push(value.voter)
		votes.push(value.votes)
	}
	await client.query`INSERT INTO hafsql.operation_delayed_voting_table
    (id, voter, votes)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${voters}::text[]), UNNEST(${votes}::int8[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillConsolidateTreasuryBalance = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const totals = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ConsolidateTreasuryBalanceOperation> ops[i].body.value
		ids.push(ops[i].id)
		totals.push(JSON.stringify(value.total_moved))
	}
	await client
		.query`INSERT INTO hafsql.operation_consolidate_treasury_balance_table
    (id, total_moved)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${totals}::jsonb[])
    ON CONFLICT (id) DO NOTHING;`
}

// const fillEffectiveCommentVote = async (
//   ops: Operations[],
//   client: customClient,
// ) => {
//   const ids = []
//   const voters = []
//   const authors = []
//   const permlinks = []
//   const weights = []
//   const rshares = []
//   const totalWeights = []
//   const pendings = []
//   for (let i = 0; i < ops.length; i++) {
//     const value = <EffectiveCommentVoteOperation> ops[i].body.value
//     ids.push(ops[i].id)
//     voters.push(value.voter)
//     authors.push(value.author)
//     permlinks.push(value.permlink)
//     weights.push(value.weight)
//     rshares.push(value.rshares)
//     totalWeights.push(value.total_vote_weight)
//     pendings.push(value.pending_payout)
//   }
//   await trx
//     .queryObject`INSERT INTO hafsql.operation_effective_comment_vote_table
//     (id, voter, author, permlink, weight, rshares, total_vote_weight,
//       pending_payout, pending_payout_symbol)
//     SELECT UNNEST(${ids}::int8[]),
//     UNNEST(${voters}::text[]), UNNEST(${authors}::text[]),
//     UNNEST(${permlinks}::text[]), UNNEST(${weights}::numeric[]),
//     UNNEST(${rshares}::numeric[]), UNNEST(${totalWeights}::numeric[]),
//     hafsql.asset_amount(UNNEST(${pendings}::text[])),
//     hafsql.asset_symbol(UNNEST(${pendings}::text[]))
//     ON CONFLICT (id) DO NOTHING;`
// }

const fillIneffectiveDeleteComment = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const authors = []
	const permlinks = []
	for (let i = 0; i < ops.length; i++) {
		const value = <IneffectiveDeleteCommentOperation> ops[i].body.value
		ids.push(ops[i].id)
		authors.push(value.author)
		permlinks.push(value.permlink)
	}
	await client
		.query`INSERT INTO hafsql.operation_ineffective_delete_comment_table
    (id, author, permlink)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${authors}::text[]), UNNEST(${permlinks}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillDhfConversion = async (ops: Operations[], client: customClient) => {
	const ids = []
	const treasurys = []
	const hives = []
	const hbds = []
	for (let i = 0; i < ops.length; i++) {
		const value = <DhfConversionOperation> ops[i].body.value
		ids.push(ops[i].id)
		treasurys.push(value.treasury)
		hives.push(value.hive_amount_in)
		hbds.push(value.hbd_amount_out)
	}
	await client.query`INSERT INTO hafsql.operation_dhf_conversion_table
    (id, treasury, hive_amount_in, hbd_amount_out)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${treasurys}::text[]),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${hbds}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillExpiredAccountNotification = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ExpiredAccountNotificationOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
	}
	await client
		.query`INSERT INTO hafsql.operation_expired_account_notification_table
    (id, account)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillChangedRecoveryAccount = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const accounts = []
	const olds = []
	const news = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ChangedRecoveryAccountOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		olds.push(value.old_recovery_account)
		news.push(value.new_recovery_account)
	}
	await client.query`INSERT INTO hafsql.operation_changed_recovery_account_table
    (id, account, old_recovery_account, new_recovery_account)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${olds}::text[]), UNNEST(${news}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillTransferToVestingCompleted = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const hives = []
	const vests = []
	for (let i = 0; i < ops.length; i++) {
		const value = <TransferToVestingCompletedOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from_account)
		tos.push(value.to_account)
		hives.push(value.hive_vested)
		vests.push(value.vesting_shares_received)
	}
	await client
		.query`INSERT INTO hafsql.operation_transfer_to_vesting_completed_table
    (id, from_account, to_account, hive_vested, vesting_shares_received)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${vests}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillPowReward = async (ops: Operations[], client: customClient) => {
	const ids = []
	const workers = []
	const rewards = []
	for (let i = 0; i < ops.length; i++) {
		const value = <PowRewardOperation> ops[i].body.value
		ids.push(ops[i].id)
		workers.push(value.worker)
		rewards.push(value.reward)
	}
	await client.query`INSERT INTO hafsql.operation_pow_reward_table
    (id, worker, reward, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${workers}::text[]),
    hafsql.asset_amount(UNNEST(${rewards}::text[])),
    hafsql.asset_symbol(UNNEST(${rewards}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillVestingSharesSplit = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const afters = []
	const befores = []
	for (let i = 0; i < ops.length; i++) {
		const value = <VestingSharesSplitOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		afters.push(value.vesting_shares_after_split)
		befores.push(value.vesting_shares_before_split)
	}
	await client.query`INSERT INTO hafsql.operation_vesting_shares_split_table
    (id, owner, vesting_shares_before_split, vesting_shares_after_split)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]),
    hafsql.asset_amount(UNNEST(${befores}::text[])),
    hafsql.asset_amount(UNNEST(${afters}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillAccountCreated = async (ops: Operations[], client: customClient) => {
	const ids = []
	const names = []
	const creators = []
	const vests = []
	const delegations = []
	for (let i = 0; i < ops.length; i++) {
		const value = <AccountCreatedOperation> ops[i].body.value
		ids.push(ops[i].id)
		names.push(value.new_account_name)
		creators.push(value.creator)
		vests.push(value.initial_vesting_shares)
		delegations.push(value.initial_delegation)
	}
	await client.query`INSERT INTO hafsql.operation_account_created_table
    (id, new_account_name, creator, initial_vesting_shares, initial_delegation)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${names}::text[]), UNNEST(${creators}::text[]),
    hafsql.asset_amount(UNNEST(${vests}::text[])),
    hafsql.asset_amount(UNNEST(${delegations}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillFillCollateralizedConvertRequest = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const rids = []
	const ins = []
	const outs = []
	const excess = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FillCollateralizedConvertRequestOperation> ops[i].body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		rids.push(value.requestid)
		ins.push(value.amount_in)
		outs.push(value.amount_out)
		excess.push(value.excess_collateral)
	}
	await client
		.query`INSERT INTO hafsql.operation_fill_collateralized_convert_request_table
    (id, owner, requestid, amount_in, amount_in_symbol, amount_out, amount_out_symbol,
      excess_collateral, excess_collateral_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${rids}::int8[]),
    hafsql.asset_amount(UNNEST(${ins}::text[])),
    hafsql.asset_symbol(UNNEST(${ins}::text[])),
    hafsql.asset_amount(UNNEST(${outs}::text[])),
    hafsql.asset_symbol(UNNEST(${outs}::text[])),
    hafsql.asset_amount(UNNEST(${excess}::text[])),
    hafsql.asset_symbol(UNNEST(${excess}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillSystemWarning = async (ops: Operations[], client: customClient) => {
	const ids = []
	const messages = []
	for (let i = 0; i < ops.length; i++) {
		const value = <SystemWarningOperation> ops[i].body.value
		ids.push(ops[i].id)
		messages.push(value.message)
	}
	await client.query`INSERT INTO hafsql.operation_system_warning_table
    (id, message)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${messages}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillFillRcurrentTransfer = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const amounts = []
	const memos = []
	const remains = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FillRecurrentTransferOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		amounts.push(value.amount)
		memos.push(value.memo)
		remains.push(value.remaining_executions)
	}
	await client.query`INSERT INTO hafsql.operation_fill_recurrent_transfer_table
    (id, from_account, to_account, amount, symbol, memo, remaining_executions)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    UNNEST(${memos}::text[]), UNNEST(${remains}::int2[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillFailedRecurrentTransfer = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const froms = []
	const tos = []
	const amounts = []
	const memos = []
	const fails = []
	const remains = []
	const deleted = []
	for (let i = 0; i < ops.length; i++) {
		const value = <FailedRecurrentTransferOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		amounts.push(value.amount)
		memos.push(value.memo)
		fails.push(value.consecutive_failures)
		remains.push(value.remaining_executions)
		deleted.push(value.deleted)
	}
	await client
		.query`INSERT INTO hafsql.operation_failed_recurrent_transfer_table
    (id, from_account, to_account, amount, symbol, memo, consecutive_failures,
      remaining_executions, deleted)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[])),
    UNNEST(${memos}::text[]), UNNEST(${fails}::int2[]),
    UNNEST(${remains}::int2[]), UNNEST(${deleted}::boolean[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillLimitOrderCancelled = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const sellers = []
	const oids = []
	const amounts = []
	for (let i = 0; i < ops.length; i++) {
		const value = <LimitOrderCancelledOperation> ops[i].body.value
		ids.push(ops[i].id)
		sellers.push(value.seller)
		oids.push(value.orderid)
		amounts.push(value.amount_back)
	}
	await client.query`INSERT INTO hafsql.operation_limit_order_cancelled_table
    (id, seller, orderid, amount_back, symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${sellers}::text[]), UNNEST(${oids}::int8[]),
    hafsql.asset_amount(UNNEST(${amounts}::text[])),
    hafsql.asset_symbol(UNNEST(${amounts}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillProducerMissed = async (ops: Operations[], client: customClient) => {
	const ids = []
	const producers = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ProducerMissedOperation> ops[i].body.value
		ids.push(ops[i].id)
		producers.push(value.producer)
	}
	await client.query`INSERT INTO hafsql.operation_producer_missed_table
    (id, producer)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${producers}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

const fillProposalFee = async (ops: Operations[], client: customClient) => {
	const ids = []
	const creators = []
	const treasurys = []
	const pids = []
	const fees = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ProposalFeeOperation> ops[i].body.value
		ids.push(ops[i].id)
		creators.push(value.creator)
		treasurys.push(value.treasury)
		pids.push(value.proposal_id)
		fees.push(value.fee)
	}
	await client.query`INSERT INTO hafsql.operation_proposal_fee_table
    (id, creator, treasury, proposal_id, fee, fee_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${creators}::text[]), UNNEST(${treasurys}::text[]),
    UNNEST(${pids}::int2[]),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillCollateralizedConvertImmediateConversion = async (
	ops: Operations[],
	client: customClient,
) => {
	const ids = []
	const owners = []
	const rids = []
	const hbds = []
	for (let i = 0; i < ops.length; i++) {
		const value = <CollateralizedConvertImmediateConversionOperation> ops[i]
			.body.value
		ids.push(ops[i].id)
		owners.push(value.owner)
		rids.push(value.requestid)
		hbds.push(value.hbd_out)
	}
	await client
		.query`INSERT INTO hafsql.operation_collateralized_convert_immediate_conversion_table
    (id, owner, requestid, hbd_out)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${owners}::text[]), UNNEST(${rids}::int8[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillEscrowApproved = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const agents = []
	const eids = []
	const fees = []
	for (let i = 0; i < ops.length; i++) {
		const value = <EscrowApprovedOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		agents.push(value.agent)
		eids.push(value.escrow_id)
		fees.push(value.fee)
	}
	await client.query`INSERT INTO hafsql.operation_escrow_approved_table
    (id, from_account, to_account, agent, escrow_id, fee, fee_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${agents}::text[]), UNNEST(${eids}::int8[]),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillEscrowRejected = async (ops: Operations[], client: customClient) => {
	const ids = []
	const froms = []
	const tos = []
	const agents = []
	const eids = []
	const hbds = []
	const hives = []
	const fees = []
	for (let i = 0; i < ops.length; i++) {
		const value = <EscrowRejectedOperation> ops[i].body.value
		ids.push(ops[i].id)
		froms.push(value.from)
		tos.push(value.to)
		agents.push(value.agent)
		eids.push(value.escrow_id)
		hbds.push(value.hbd_amount)
		hives.push(value.hive_amount)
		fees.push(value.fee)
	}
	await client.query`INSERT INTO hafsql.operation_escrow_rejected_table
    (id, from_account, to_account, agent, escrow_id, hbd_amount, hive_amount,
      fee, fee_symbol)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${froms}::text[]), UNNEST(${tos}::text[]),
    UNNEST(${agents}::text[]), UNNEST(${eids}::int8[]),
    hafsql.asset_amount(UNNEST(${hbds}::text[])),
    hafsql.asset_amount(UNNEST(${hives}::text[])),
    hafsql.asset_amount(UNNEST(${fees}::text[])),
    hafsql.asset_symbol(UNNEST(${fees}::text[]))
    ON CONFLICT (id) DO NOTHING;`
}

const fillProxyCleared = async (ops: Operations[], client: customClient) => {
	const ids = []
	const accounts = []
	const proxys = []
	for (let i = 0; i < ops.length; i++) {
		const value = <ProxyClearedOperation> ops[i].body.value
		ids.push(ops[i].id)
		accounts.push(value.account)
		proxys.push(value.proxy)
	}
	await client.query`INSERT INTO hafsql.operation_proxy_cleared_table
    (id, account, proxy)
    SELECT UNNEST(${ids}::int8[]),
    UNNEST(${accounts}::text[]), UNNEST(${proxys}::text[])
    ON CONFLICT (id) DO NOTHING;`
}

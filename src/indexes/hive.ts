import { pool } from '../helpers/database.ts'
import { opId } from '../helpers/operation_id.ts'
import { print } from '../helpers/print.ts'

export const createHiveIndexes = async () => {
	using client = await pool.connect()
	for (let i = 0; i < hiveIndexes.length - 1; i++) {
		const name = hiveIndexes[i].name
		const params = hiveIndexes[i].params
		const ids = hiveIndexes[i].ids
		const skip = hiveIndexes[i].skip
		if (skip) {
			continue
		}
		let condition = ''
		if (ids.length > 0) {
			if (ids.length > 1) {
				condition = `WHERE hive.operation_id_to_type_id(id) IN (${ids.join()})`
			} else {
				condition = `WHERE hive.operation_id_to_type_id(id) = ${ids[0]}`
			}
		}
		const exists = await doesIndexExist(name)
		if (exists) {
			continue
		}
		await client.queryObject(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON hive.operations ${params} ${condition};`,
		)
		print(`[Indexes] Index ${name} done! ✅`)
		hiveCreatedIndexes.push(name)
	}
	print('[Indexes] All indexes have been created! ✅')
}

const doesIndexExist = async (name: string) => {
	using client = await pool.connect()
	const result = await client.queryObject<{ indisready: boolean }>(
		`SELECT ix.indisready
			FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
			WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid
			AND a.attnum = ANY(ix.indkey) AND t.relkind = 'r' AND ix.indisready = true
			AND i.relname = $1`,
		[name],
	)
	if (result.rows.length < 1) {
		return false
	}
	return result.rows[0].indisready
}

// push name of the created indexes into this array
const hiveCreatedIndexes: string[] = []

/**
 * Return true if the index was created
 */
export const isHiveIndexCreated = (name: string): boolean => {
	if (hiveCreatedIndexes.indexOf(name) === -1) {
		return false
	}
	return true
}

/**
 * Return the jsonb cast of the parameter from the operation body
 */
const param = (param: string, jsonb = false): string => {
	if (jsonb) {
		return `(body_binary::jsonb->'value'->'${param}')`
	}
	return `(body_binary::jsonb->'value'->>'${param}')`
}

// Indexes on hive.operations
// The first ones are needed to sync so we create them first
const hiveIndexes: {
	name: string
	params: string
	ids: number[] | null[]
	skip: boolean
}[] = [
	// sorting by ID (op_id) on op_* & vo_* views
	{
		name: 'hafsql_hive_operations_op_type_id_id',
		params: '(hive.operation_id_to_type_id(id), id)',
		ids: [],
		skip: false,
	},
	// id - used in follows, reblogs, & communities sync
	{
		name: 'hafsql_id_opid_idx',
		params: `(${param('id')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [opId.custom, opId.custom_json],
		skip: false,
	},
	// author, permlink - used in rewards
	{
		name: 'hafsql_author_permlink_idx',
		params: `(${param('author')}, ${
			param('permlink')
		}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.vote,
			opId.comment,
			opId.delete_comment,
			opId.comment_options,
			opId.author_reward,
			opId.comment_reward,
			opId.effective_comment_vote,
		],
		skip: false,
	},
	// voter - op_
	{
		name: 'hafsql_voter_idx',
		params: `(${param('voter')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [opId.vote, opId.update_proposal_votes],
		skip: false,
	},
	// author - op_
	{
		name: 'hafsql_author_idx',
		params: `(${param('author')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.vote,
			opId.comment,
			opId.delete_comment,
			opId.comment_options,
			opId.author_reward,
			opId.comment_reward,
			opId.effective_comment_vote,
		],
		skip: false,
	},
	// parent_author - op_
	{
		name: 'hafsql_parent_author_idx',
		params: `(${param('parent_author')}, id DESC)`,
		ids: [opId.comment],
		skip: false,
	},
	// parent_author, parent_permlink
	{
		name: 'hafsql_parent_author_parent_permlink_idx',
		params: `(${param('parent_author')}, ${param('parent_permlink')}, id DESC)`,
		ids: [opId.comment],
		skip: false,
	},
	// from
	{
		name: 'hafsql_from_idx',
		params: `(${param('from')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.transfer,
			opId.transfer_to_vesting,
			opId.transfer_to_savings,
			opId.transfer_from_savings,
			opId.cancel_transfer_from_savings,
			opId.fill_transfer_from_savings,
		],
		skip: false,
	},
	// to
	{
		name: 'hafsql_to_idx',
		params: `(${param('to')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.transfer,
			opId.transfer_to_vesting,
			opId.transfer_to_savings,
			opId.transfer_from_savings,
			opId.fill_transfer_from_savings,
		],
		skip: false,
	},
	// memo
	{
		name: 'hafsql_memo_idx',
		params: `(${param('memo')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.transfer,
			opId.transfer_to_savings,
			opId.transfer_from_savings,
			opId.recurrent_transfer,
			opId.fill_transfer_from_savings,
			opId.fill_recurrent_transfer,
			opId.failed_recurrent_transfer,
		],
		skip: false,
	},
	// TODO: remove this after locale C on HAF
	// memo - for queries with LIKE 'test%'
	{
		name: 'hafsql_memo_pattern_idx',
		params: `(${param('memo')} text_pattern_ops, id DESC)`,
		ids: [opId.transfer],
		skip: false,
	},
	// account
	{
		name: 'hafsql_account_idx',
		params: `(${param('account')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.withdraw_vesting,
			opId.account_update,
			opId.account_witness_vote,
			opId.account_witness_proxy,
			opId.claim_reward_balance,
			opId.account_update2,
			opId.return_vesting_delegation,
			opId.changed_recovery_account,
		],
		skip: false,
	},
	// owner
	{
		name: 'hafsql_owner_idx',
		params: `(${param('owner')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.limit_order_create,
			opId.limit_order_cancel,
			opId.convert,
			opId.witness_update,
			opId.limit_order_create2,
			opId.witness_set_properties,
			opId.collateralized_convert,
			opId.fill_convert_request,
			opId.expired_account_notification,
			opId.fill_collateralized_convert_request,
			opId.collateralized_convert_immediate_conversion,
		],
		skip: false,
	},
	// orderid
	{
		name: 'hafsql_orderid_idx',
		params: `(${param('orderid')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.limit_order_create,
			opId.limit_order_cancel,
			opId.limit_order_create2,
		],
		skip: false,
	},
	// publisher
	{
		name: 'hafsql_publisher_idx',
		params: `(${param('publisher')}, id DESC)`,
		ids: [opId.feed_publish],
		skip: false,
	},
	// creator
	{
		name: 'hafsql_creator_idx',
		params: `(${param('creator')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.account_create,
			opId.claim_account,
			opId.create_claimed_account,
			opId.account_create_with_delegation,
			opId.escrow_approve,
		],
		skip: false,
	},
	// new_account_name
	{
		name: 'hafsql_new_account_name_idx',
		params: `(${
			param('new_account_name')
		}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.account_create,
			opId.create_claimed_account,
			opId.account_create_with_delegation,
			opId.account_created,
		],
		skip: false,
	},
	// witness
	{
		name: 'hafsql_witness_idx',
		params: `(${param('witness')}, id DESC)`,
		ids: [opId.account_witness_vote],
		skip: false,
	},
	// proxy
	{
		name: 'hafsql_proxy_idx',
		params: `(${param('proxy')}, id DESC)`,
		ids: [opId.account_witness_proxy],
		skip: false,
	},
	// from_account
	{
		name: 'hafsql_from_account_idx',
		params: `(${
			param('from_account')
		}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.set_withdraw_vesting_route,
			opId.fill_vesting_withdraw,
			opId.transfer_to_vesting_completed,
		],
		skip: false,
	},
	// to_account
	{
		name: 'hafsql_to_account_idx',
		params: `(${
			param('to_account')
		}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.set_withdraw_vesting_route,
			opId.fill_vesting_withdraw,
			opId.transfer_to_vesting_completed,
		],
		skip: false,
	},
	// account_to_recover
	{
		name: 'hafsql_account_to_recover_idx',
		params: `(${param('account_to_recover')}, id DESC)`,
		ids: [opId.change_recovery_account],
		skip: false,
	},
	// new_recovery_account
	{
		name: 'hafsql_new_recovery_account_idx',
		params: `(${param('new_recovery_account')}, id DESC)`,
		ids: [opId.change_recovery_account],
		skip: false,
	},
	// delegator
	{
		name: 'hafsql_delegator_id_idx',
		params: `(${param('delegator')}, id DESC)`,
		ids: [opId.delegate_vesting_shares],
		skip: false,
	},
	// delegatee
	{
		name: 'hafsql_delegatee_idx',
		params: `(${param('delegatee')}, id DESC)`,
		ids: [opId.delegate_vesting_shares],
		skip: false,
	},
	// curator
	{
		name: 'hafsql_curator_idx',
		params: `(${param('curator')}, id DESC)`,
		ids: [opId.curation_reward],
		skip: false,
	},
	// current_owner
	{
		name: 'hafsql_current_owner_idx',
		params: `(${param('current_owner')}, id DESC)`,
		ids: [opId.fill_order],
		skip: false,
	},
	// current_orderid
	{
		name: 'hafsql_current_orderid_idx',
		params: `(${param('current_orderid')}, id DESC)`,
		ids: [opId.fill_order],
		skip: false,
	},
	// open_owner
	{
		name: 'hafsql_open_owner_idx',
		params: `(${param('open_owner')}, id DESC)`,
		ids: [opId.fill_order],
		skip: false,
	},
	// open_orderid
	{
		name: 'hafsql_open_orderid_idx',
		params: `(${param('open_orderid')}, id DESC)`,
		ids: [opId.fill_order],
		skip: false,
	},
	// benefactor
	{
		name: 'hafsql_benefactor_idx',
		params: `(${param('benefactor')}, id DESC)`,
		ids: [opId.comment_benefactor_reward],
		skip: false,
	},
	// producer
	{
		name: 'hafsql_producer_idx',
		params: `(${param('producer')}, id DESC)`,
		ids: [opId.producer_reward],
		skip: false,
	},
	// receiver
	{
		name: 'hafsql_receiver_idx',
		params: `(${param('receiver')}, id DESC)`,
		ids: [opId.proposal_pay],
		skip: false,
	},
]

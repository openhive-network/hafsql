import { pool } from '../helpers/database.ts'
import { opId } from '../helpers/operation_id.ts'
import { print } from '../helpers/functions/print.ts'

export const createHiveIndexes = async () => {
	using client = await pool.connect()
	// Kill all running queries by hafsql
	await client.queryObject(
		`SELECT pg_cancel_backend(sa.pid) FROM pg_catalog.pg_stat_activity sa WHERE sa.application_name=$1 AND sa.query LIKE $2`,
		['hafsql', 'CREATE%'],
	)
	const invalidIndexes = await getInvalidIndexes()
	invalidIndexes.forEach(async (index) => {
		await client.queryObject(`DROP INDEX hive.${index};`)
	})
	for (let i = 0; i < hiveIndexes.length; i++) {
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
			// for now only used by one index so should be fine
			if (hiveIndexes[i].condition) {
				condition += ` AND ${hiveIndexes[i].condition}`
			}
		}

		const exists = await doesIndexExist(name)
		if (exists) {
			continue
		}
		const table = hiveIndexes[i].table || 'hive.operations'
		await client.queryObject(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${table} ${params} ${condition};`,
		)
		print(`[Indexes] Index ${name} done! ✅`)
	}
	print('[Indexes] All indexes have been created! ✅')
}

/**
 * Return true if the index was created
 */
export const doesIndexExist = async (name: string) => {
	using client = await pool.connect()
	const result = await client.queryObject<{ indisvalid: boolean }>(
		`SELECT ix.indisvalid
			FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
			WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid
			AND a.attnum = ANY(ix.indkey) AND t.relkind = 'r' AND ix.indisready = true
			AND i.relname = $1`,
		[name],
	)
	if (result.rows.length < 1) {
		return false
	}
	return result.rows[0].indisvalid
}

const getInvalidIndexes = async () => {
	using client = await pool.connect()
	const result = await client.queryObject<{ relname: string }>(`SELECT c.relname
		FROM pg_catalog.pg_class c, pg_catalog.pg_namespace n, pg_catalog.pg_index i
		WHERE  (i.indisvalid = false OR i.indisready = false) AND
			i.indexrelid = c.oid AND c.relnamespace = n.oid AND
			n.nspname != 'pg_catalog' AND
			n.nspname != 'information_schema' AND
			n.nspname != 'pg_toast'`)
	const temp = []
	for (let i = 0; i < result.rows.length; i++) {
		temp.push(result.rows[i].relname)
	}
	return temp
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
	table?: string
	condition?: string
}[] = [
	// sorting by ID (op_id) on op_* & vo_* views - needed for sync
	{
		name: 'hafsql_hive_operations_op_type_id_id',
		params: '(hive.operation_id_to_type_id(id), id)',
		ids: [],
		skip: false,
	},
	// author, permlink - used in rewards and reputations
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
			opId.comment_payout_update,
			opId.comment_benefactor_reward,
			opId.ineffective_delete_comment,
		],
		skip: false,
	},
	// id - used in follows, reblogs, communities & rc_delegations sync
	{
		name: 'hafsql_id_opid_idx',
		params: `(${param('id')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [opId.custom, opId.custom_json],
		skip: false,
	},
	// voter - op_
	{
		name: 'hafsql_voter_idx',
		params: `(${param('voter')}, hive.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.vote,
			opId.update_proposal_votes,
			opId.effective_comment_vote,
			opId.delayed_voting,
		],
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
			opId.comment_payout_update,
			opId.comment_benefactor_reward,
			opId.ineffective_delete_comment,
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
			opId.escrow_transfer,
			opId.escrow_dispute,
			opId.escrow_release,
			opId.escrow_approve,
			opId.recurrent_transfer,
			opId.fill_transfer_from_savings,
			opId.fill_recurrent_transfer,
			opId.failed_recurrent_transfer,
			opId.escrow_approved,
			opId.escrow_rejected,
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
			opId.escrow_transfer,
			opId.escrow_dispute,
			opId.escrow_release,
			opId.escrow_approve,
			opId.recurrent_transfer,
			opId.fill_transfer_from_savings,
			opId.fill_recurrent_transfer,
			opId.failed_recurrent_transfer,
			opId.escrow_approved,
			opId.escrow_rejected,
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
	// Update: we might not need this anymore - develop is locale c
	// memo - for queries with LIKE 'test%'
	// {
	// 	name: 'hafsql_memo_pattern_idx',
	// 	params: `(${param('memo')} text_pattern_ops, id DESC)`,
	// 	ids: [opId.transfer],
	// 	skip: false,
	// },
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
			opId.decline_voting_rights,
			opId.return_vesting_delegation,
			opId.changed_recovery_account,
			opId.hardfork_hive,
			opId.hardfork_hive_restore,
			opId.expired_account_notification,
			opId.proxy_cleared,
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
			opId.account_create,
			opId.account_update,
			opId.witness_update,
			opId.limit_order_create2,
			opId.create_claimed_account,
			opId.account_create_with_delegation,
			opId.witness_set_properties,
			opId.collateralized_convert,
			opId.fill_convert_request,
			opId.liquidity_reward,
			opId.interest,
			opId.shutdown_witness,
			opId.vesting_shares_split,
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
			opId.limit_order_cancelled,
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
			opId.create_proposal,
			opId.update_proposal,
			opId.account_created,
			opId.proposal_fee,
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
		ids: [opId.account_witness_proxy, opId.proxy_cleared],
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
		ids: [
			opId.request_account_recovery,
			opId.recover_account,
			opId.change_recovery_account,
		],
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
		ids: [opId.producer_reward, opId.producer_missed],
		skip: false,
	},
	// receiver
	{
		name: 'hafsql_receiver_idx',
		params: `(${param('receiver')}, id DESC)`,
		ids: [opId.escrow_release, opId.create_proposal, opId.proposal_pay],
		skip: false,
	},
	// json_metadata ->> content_type - for peakd polls
	// to_json() because there are invalid jsons
	{
		name: 'hafsql_json_metadata_idx',
		params: `((hafsql.to_json(${
			param('json_metadata')
		})->>'content_type'), id DESC)`,
		ids: [opId.comment],
		skip: false,
	},
	// from, to - only transfers - no id
	{
		name: 'hafsql_from_to_idx',
		params: `(${param('from')}, ${param('to')})`,
		ids: [
			opId.transfer,
		],
		skip: false,
	},
	// hive.transactions trx_id
	// {
	// 	name: 'hafsql_trx_id_idx',
	// 	params: `(encode(trx_hash, 'hex'::text))`,
	// 	ids: [],
	// 	skip: false,
	// 	table: 'hive.transactions',
	// },
]

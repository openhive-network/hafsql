import { query } from '../helpers/database.ts'
import { opId } from '../helpers/operation_id.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'

export const createHiveIndexes = async () => {
	try {
		// Kill all running queries by hafsql
		await query(
			`SELECT pg_cancel_backend(sa.pid) FROM pg_catalog.pg_stat_activity sa WHERE sa.application_name=$1 AND sa.query LIKE $2`,
			['hafsql', 'CREATE%'],
		)
		const invalidIndexes = await getInvalidIndexes()
		invalidIndexes.forEach(async (index) => {
			await query(`DROP INDEX CONCURRENTLY hafd.${index};`)
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
					condition =
						`WHERE hafd.operation_id_to_type_id(id) IN (${ids.join()})`
				} else {
					condition = `WHERE hafd.operation_id_to_type_id(id) = ${ids[0]}`
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
			const table = hiveIndexes[i].table || 'hafd.operations'
			await query(
				`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${table} ${params} ${condition};`,
			)
			print(`[Indexes] Index ${name} done! ✅`)
		}
		print('[Indexes] All indexes have been created! ✅')
		print('[Indexes] Creating Hivemind indexes...')
		await createHivemindIndexes()
	} catch (_e) {
		print('Retrying index creation... (this is normal)')
		await sleep(10000)
		createHiveIndexes()
	}
}

/**
 * Return true if the index was created
 */
export const doesIndexExist = async (name: string) => {
	const result = await query<{ indisvalid: boolean }>(
		`SELECT i.indisvalid
			FROM pg_index i
			JOIN pg_class c ON c.oid = i.indrelid
			JOIN pg_class t ON t.oid = i.indexrelid
			WHERE t.relname = $1`,
		[name],
	)
	if (result.rows.length < 1) {
		return false
	}
	return result.rows[0].indisvalid
}

const getInvalidIndexes = async () => {
	const result = await query<{ relname: string }>(`SELECT c.relname
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

// Indexes on hafd.operations
// The first ones are needed to sync so we create them first
export const hiveIndexes: {
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
		params: '(hafd.operation_id_to_type_id(id), id)',
		ids: [],
		skip: false,
	},
	// author, permlink - used in rewards and reputations
	{
		name: 'hafsql_author_permlink_idx',
		params: `(${param('author')}, ${
			param('permlink')
		}, hafd.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.vote,
			opId.comment,
			opId.effective_comment_vote,
		],
		skip: false,
	},
	// id - used in follows, reblogs, communities & rc_delegations sync
	{
		name: 'hafsql_id_opid_idx',
		params: `(${param('id')}, id)`,
		ids: [opId.custom_json],
		skip: false,
	},
	// voter - op_
	{
		name: 'hafsql_voter_idx',
		params: `(${param('voter')}, hafd.operation_id_to_type_id(id), id)`,
		ids: [
			opId.vote,
			opId.effective_comment_vote,
		],
		skip: false,
	},
	// author - op_
	{
		name: 'hafsql_author_idx',
		params: `(${param('author')}, hafd.operation_id_to_type_id(id), id DESC)`,
		ids: [
			opId.vote,
			opId.comment,
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
		params: `(${param('parent_author')}, ${param('parent_permlink')})`,
		ids: [opId.comment],
		skip: false,
	},
	// json_metadata ->> content_type - for peakd polls
	{
		name: 'hafsql_content_type_idx',
		params: `(hafsql.get_content_type(body_binary), id DESC)`,
		ids: [opId.comment],
		skip: false,
	},
]

// We don't need this but people need it to run queries on hivemind tables
export const createHivemindIndexes = async () => {
	try {
		await query(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_last_update_rshares_idx ON hivemind_app.hive_votes USING btree (last_update, rshares);`,
		)
		await query(
			`CREATE index CONCURRENTLY IF NOT EXISTS hafsql_last_update_vote_percent_idx ON hivemind_app.hive_votes USING btree (last_update, vote_percent);`,
		)
		print(`[Indexes] Hivemind indexes done! ✅`)
	} catch {
		print('Hivemind is probably not installed yet, retrying in 5 minutes...')
		await sleep(300000)
		await createHivemindIndexes()
	}
}

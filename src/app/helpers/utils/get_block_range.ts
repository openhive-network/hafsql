import { customClient, query } from '../database.ts'
import { BlockRange } from '../types.ts'

// These update comments_table so they must not pass the comments sync
const dependsOnComments = ['paid_rewards', 'pending_rewards', 'delete_comments']

export const getBlockRange = async (
	table: string,
	client: customClient = { query },
	range = 50000,
) => {
	const blockRangeQ = await client.query<BlockRange>(
		'SELECT hafsql.get_next_block_range($1, $2) as block_range;',
		[table, range],
	)
	if (blockRangeQ.rows.length === 0) {
		return null
	}
	const rangeArray = blockRangeQ.rows[0].block_range
	if (!Array.isArray(rangeArray)) {
		return null
	}
	if (table === 'operations') {
		return rangeArray
	}
	// Lag other tables behind the table they read from to avoid race conditions
	// where a sync tries to fetch block X but that table has not finished adding block X
	const result = await client.query<{ last_block_num: number }>(
		`SELECT last_block_num FROM hafsql.sync_data WHERE table_name = $1`,
		[dependsOnComments.includes(table) ? 'comments' : 'operations'],
	)
	const lower = rangeArray[0]
	let higher = rangeArray[1]
	if (result.rows.length === 0) {
		return null
	}
	const lastOperationsNum = result.rows[0].last_block_num
	if (higher > lastOperationsNum) {
		higher = lastOperationsNum
	}
	if (higher < lower) {
		return null
	}
	return [lower, higher]
}

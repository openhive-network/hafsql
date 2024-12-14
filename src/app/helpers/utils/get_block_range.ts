import { customClient, query } from '../database.ts'
import { BlockRange } from '../types.ts'

export const getBlockRange = async (
	table: string,
	client: customClient = { query },
	range = 50000,
) => {
	const blockRangeQ = await client.query<BlockRange>(
		'SELECT hafsql.get_next_block_range($1, $2) as block_range;',
		[table, range],
	)
	if (blockRangeQ.rows.length < 1) {
		return null
	}
	return blockRangeQ.rows[0].block_range
}

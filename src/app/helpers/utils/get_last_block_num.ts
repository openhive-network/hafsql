import { customClient, query } from '../database.ts'

export const getLastBlockNum = async (
	table: string,
	client: customClient = { query },
) => {
	const result = await client.query<{ last_block_num: number }>(
		'SELECT last_block_num FROM hafsql.sync_data WHERE table_name=$1;',
		[table],
	)
	return result.rows[0].last_block_num
}

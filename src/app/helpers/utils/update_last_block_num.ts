import { customClient, query } from '../database.ts'

export const updateLastBlockNum = async (
	table: string,
	blockNum: number,
	client: customClient = { query },
) => {
	await client.query(
		'UPDATE hafsql.sync_data SET last_block_num=$1 WHERE table_name=$2;',
		[blockNum, table],
	)
}

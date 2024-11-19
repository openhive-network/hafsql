import { PoolClient, Transaction } from '../../../deps.ts'
import { pool } from '../database.ts'

export const getLastBlockNum = async (
  table: string,
  _client?: Transaction | PoolClient,
) => {
  if (!_client) {
    using client = await pool.connect()
    const result = await client.queryObject<{ last_block_num: number }>(
      'SELECT last_block_num FROM hafsql.sync_data WHERE table_name=$1;',
      [table],
    )
    return result.rows[0].last_block_num
  } else {
    const result = await _client.queryObject<{ last_block_num: number }>(
      'SELECT last_block_num FROM hafsql.sync_data WHERE table_name=$1;',
      [table],
    )
    return result.rows[0].last_block_num
  }
}

import { PoolClient, Transaction } from '../../../deps.ts'
import { pool } from '../database.ts'
import { BlockRange } from '../types.ts'

export const getBlockRange = async (
  table: string,
  _client?: PoolClient | Transaction,
  range = 50000,
) => {
  if (!_client) {
    using client = await pool.connect()
    const blockRangeQ = await client.queryObject<BlockRange>(
      'SELECT hafsql.get_next_block_range($1, $2) as block_range;',
      [table, range],
    )
    if (blockRangeQ.rows.length < 1) {
      return null
    }
    return blockRangeQ.rows[0].block_range
  } else {
    const blockRangeQ = await _client.queryObject<BlockRange>(
      'SELECT hafsql.get_next_block_range($1, $2) as block_range;',
      [table, range],
    )
    if (blockRangeQ.rows.length < 1) {
      return null
    }
    return blockRangeQ.rows[0].block_range
  }
}

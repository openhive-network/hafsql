import { pool } from '../database.ts'
import { BlockRange } from '../types.ts'

export const getBlockRange = async (table: string) => {
  using client = await pool.connect()
  const blockRangeQ = await client.queryObject<BlockRange>(
    'SELECT hafsql.get_next_block_range($1) as block_range;',
    [table],
  )
  if (blockRangeQ.rows.length < 1) {
    return null
  }
  return blockRangeQ.rows[0].block_range
}

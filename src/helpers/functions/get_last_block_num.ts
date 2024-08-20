import { pool } from '../database.ts'

export const getLastBlockNum = async (table: string) => {
  using client = await pool.connect()
  const result = await client.queryObject<{ last_block_num: number }>(
    'SELECT last_block_num FROM hafsql.sync_data WHERE table_name=$1;',
    [table],
  )
  return result.rows[0].last_block_num
}

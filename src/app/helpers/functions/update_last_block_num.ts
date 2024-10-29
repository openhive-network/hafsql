import { PoolClient } from '../../../deps.ts'
import { Transaction } from '../../../deps.ts'

export const updateLastBlockNum = async (
  table: string,
  blockNum: number,
  trx: Transaction | PoolClient,
) => {
  await trx.queryObject(
    'UPDATE hafsql.sync_data SET last_block_num=$1 WHERE table_name=$2;',
    [blockNum, table],
  )
}

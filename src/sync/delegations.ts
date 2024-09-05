import { Transaction } from '../deps.ts'
import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import { Delegations, HardforkHive } from '../helpers/types.ts'
import { createDelegationsIndexes } from '../indexes/hafsql.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[HP Delegations] Start massive sync... ⏳')
      syncDelegations()
    }
  }
}

let firstRun = true
const syncDelegations = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillDelegations()
    print('[HP Delegations] Massive sync done ✅')
    print('[HP Delegations] Creating indexes... ⏳')
    await createDelegationsIndexes()
    print('[HP Delegations] Indexes have been created ✅')
    print('[HP Delegations] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillDelegations()
  await sleep(intervalTime)
  syncDelegations()
}

export const fillDelegations = async () => {
  let blockRange = await getBlockRange('delegations')
  while (blockRange) {
    const delegations = await getDelegations(blockRange)
    await insertDelegations(delegations, blockRange)
    blockRange = await getBlockRange('delegations')
  }
}

// hafsql.op_account_create_with_delegation
// TODO: handle vo_hardfork_hive
const getDelegations = async (blockRange: number[]) => {
  using client = await pool.connect()
  const result = await client.queryObject<Delegations>(
    `SELECT delegator, delegatee, vesting_shares, timestamp, op_id, block_num FROM hafsql.op_delegate_vesting_shares
      WHERE op_id >= hafsql.first_op_id_from_block_num($1)
      AND op_id <= hafsql.last_op_id_from_block_num($2)
      UNION ALL
      SELECT creator AS delegator, new_account_name AS delegatee, delegation_vests AS vesting_shares, timestamp, op_id, block_num
      FROM hafsql.op_account_create_with_delegation
      WHERE op_id >= hafsql.first_op_id_from_block_num($1)
      AND op_id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY op_id ASC`,
    [blockRange[0], blockRange[1]],
  )
  return result.rows
}

const insertDelegations = async (
  delegations: Delegations[],
  blockRange: number[],
) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_delegations_sync')
  await trx.begin()
  for (let i = 0; i < delegations.length; i++) {
    const { delegator, delegatee, vesting_shares, timestamp, block_num } =
      delegations[i]
    if (block_num === 41818752) {
      // clear hardfork_hive accounts delegations
      await clearHiveForkDelegations(trx)
    }
    if (Number(vesting_shares) === Number(0)) {
      await trx.queryObject(
        `DELETE FROM hafsql.delegations_table
          WHERE delegator=$1 AND delegatee=$2;`,
        [delegator, delegatee],
      )
    } else {
      await trx.queryObject(
        `INSERT INTO hafsql.delegations_table (delegator, delegatee, vests, timestamp)
          VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT hafsql_delegations_table_un
          DO UPDATE SET vests=$3, timestamp=$4;`,
        [delegator, delegatee, vesting_shares, timestamp],
      )
    }
  }
  await updateLastBlockNum('delegations', blockRange[1], trx)
  await trx.commit()
}

const clearHiveForkDelegations = async (trx: Transaction) => {
  const result = await trx.queryObject<HardforkHive>(
    `SELECT account, hbd_transferred, hive_transferred, vests_converted FROM hafsql.vo_hardfork_hive`,
  )
  for (let i = 0; i < result.rows.length; i++) {
    const { account } = result.rows[i]
    await trx.queryObject(
      `DELETE FROM hafsql.delegations_table
        WHERE delegator=$1;`,
      [account],
    )
  }
}

import { pool } from '../helpers/database.ts'
import { print } from '../helpers/print.ts'
import { sleep } from '../helpers/sleep.ts'
import { Delegations, LastOpId } from '../helpers/types.ts'
import { createDelegationsIndexes } from '../indexes/hafsql.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[HP Delegations] Start massive sync... 🚀')
      syncDelegations()
    }
  }
}

let firstRun = true
const syncDelegations = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillDelegations(50000)
    print('[HP Delegations] Massive sync done ✅')
    print('[HP Delegations] Creating indexes... 🚀')
    await createDelegationsIndexes()
    print('[HP Delegations] Indexes have been created ✅')
    print('[HP Delegations] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillDelegations(20000)
  await sleep(intervalTime)
  syncDelegations()
}

export const fillDelegations = async (limit: number) => {
  const client = await pool.connect()
  const startQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['delegations'],
  )
  client.release()
  let start = startQ.rows[0].last_op_id
  let delegations = await getDelegations(start, limit)
  while (delegations.length > 0) {
    await insertDelegations(delegations)
    start = delegations[delegations.length - 1].op_id
    await updateLastOpId(start)
    delegations = await getDelegations(start, limit)
  }
}

const getDelegations = async (start: bigint, limit: number) => {
  using client = await pool.connect()
  const result = await client.queryObject<Delegations>(
    `SELECT op_id, delegator, delegatee, vesting_shares FROM hafsql.op_delegate_vesting_shares
      WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2`,
    [start, limit],
  )
  return result.rows
}

const insertDelegations = async (delegations: Delegations[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_delegations_sync')
  await trx.begin()
  for (let i = 0; i < delegations.length; i++) {
    const { delegator, delegatee, vesting_shares } = delegations[i]
    const vests = JSON.parse(vesting_shares).amount
    // TODO: It doesn't delete currently - will need to debug this
    if (vests === '0') {
      await trx.queryObject(
        `DELETE FROM hafsql.delegations_table
          WHERE delegator=$1 AND delegatee=$2;`,
        [delegator, delegatee],
      )
    }
    await trx.queryObject(
      `INSERT INTO hafsql.delegations_table (delegator, delegatee, vests)
        VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_delegations_table_un
        DO UPDATE SET vests=$3;`,
      [delegator, delegatee, vests],
    )
  }
  await trx.commit()
}

const updateLastOpId = async (opId: bigint) => {
  using client = await pool.connect()
  return client.queryObject(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'delegations'],
  )
}

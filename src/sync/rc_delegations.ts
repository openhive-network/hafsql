import { JSONBigInt } from '../deps.ts'
import { pool } from '../helpers/database.ts'
import { print } from '../helpers/print.ts'
import { sleep } from '../helpers/sleep.ts'
import {
  LastOpId,
  RcCustomJson,
  RcDelegation,
  RcDelegationAppended,
} from '../helpers/types.ts'
import { clearUsername } from '../helpers/validate_username.ts'
import { createRCDelegationsIndexes } from '../indexes/hafsql.ts'

// Need this to handle large RC numbers
const JSONparser = JSONBigInt({ storeAsString: true }).parse

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[RC Delegations] Start massive sync... 🚀')
      syncRCDelegations()
    }
  }
}

let firstRun = true
const syncRCDelegations = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillRCDelegations(50000)
    print('[RC Delegations] Massive sync done ✅')
    print('[RC Delegations] Creating indexes... 🚀')
    await createRCDelegationsIndexes()
    print('[RC Delegations] Indexes have been created ✅')
    print('[RC Delegations] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillRCDelegations(20000)
  await sleep(intervalTime)
  syncRCDelegations()
}

export const fillRCDelegations = async (limit: number) => {
  const client = await pool.connect()
  const startQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['rc_delegations'],
  )
  client.release()
  let start = startQ.rows[0].last_op_id
  let delegations = await getRCDelegations(start, limit)
  while (delegations.length > 0) {
    await insertRCDelegations(delegations)
    start = delegations[delegations.length - 1].op_id
    await updateLastOpId(start)
    delegations = await getRCDelegations(start, limit)
  }
}

const getRCDelegations = async (start: bigint, limit: number) => {
  const client = await pool.connect()
  const result = await client.queryObject<RcCustomJson>(
    `SELECT op_id, json FROM hafsql.op_custom_json
    WHERE id=$1 AND op_id > $2 ORDER BY op_id ASC LIMIT $3`,
    ['rc', start, limit],
  )
  client.release()
  if (result.rows.length <= 0) {
    return []
  }
  // Validating RC delegtaion
  // ["delegate_rc",{"from":"hiveonboard","delegatees":["ivirm0214"],"max_rc":10000000000}]
  // [["delegate_rc",{"from":"hiveonboard","delegatees":["ivirm0214"],"max_rc":10000000000}]]
  const delegationsArray = []
  for (let i = 0; i < result.rows.length; i++) {
    const rcDelegation = result.rows[i]
    try {
      const parsedJson: RcDelegation = JSONparser(rcDelegation.json)
      if (!Array.isArray(parsedJson)) {
        continue
      }
      if (parsedJson.length < 1) {
        continue
      }
      if (Array.isArray(parsedJson[0])) {
        // multiple delegations
        for (let k = 0; k < parsedJson.length; k++) {
          const delegation = extractRCDelegationFromArray(parsedJson[k])
          if (delegation !== null) {
            const temp = { ...delegation, op_id: rcDelegation.op_id }
            delegationsArray.push(temp)
          }
        }
      } else {
        const delegation = extractRCDelegationFromArray(parsedJson)
        if (delegation !== null) {
          const temp = { ...delegation, op_id: rcDelegation.op_id }
          delegationsArray.push(temp)
        }
      }
    } catch (_e) {
      continue
    }
  }
  return delegationsArray
}

const extractRCDelegationFromArray = (arr: RcDelegation) => {
  if (arr[0] !== 'delegate_rc' && arr[0] !== 0) {
    return null
  }
  // We assume the delegation is valid because it is included in the blocks
  const { from, delegatees } = arr[1]
  let max_rc = arr[1].max_rc
  if (typeof max_rc === 'undefined' || max_rc === null) {
    max_rc = '0'
  }
  return {
    from,
    delegatees,
    max_rc,
  }
}

const insertRCDelegations = async (delegations: RcDelegationAppended[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_rc_delegations_sync')
  await trx.begin()
  for (let i = 0; i < delegations.length; i++) {
    const { max_rc } = delegations[i]
    const from = clearUsername(delegations[i].from)
    const delegatees = [...new Set(delegations[i].delegatees)]
    for (let k = 0; k < delegatees.length; k++) {
      const delegatee = clearUsername(delegatees[k])
      if (max_rc === '0' || max_rc === 0) {
        await trx.queryObject(
          `DELETE FROM hafsql.rc_delegations_table
            WHERE delegator=$1 AND delegatee=$2;`,
          [from, delegatee],
        )
      } else {
        await trx.queryObject(
          `INSERT INTO hafsql.rc_delegations_table (delegator, delegatee, rc)
            VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_rc_delegations_table_un
            DO UPDATE SET rc=$3;`,
          [from, delegatee, max_rc],
        )
      }
    }
  }
  await trx.commit()
}

const updateLastOpId = async (opId: bigint) => {
  using client = await pool.connect()
  return client.queryObject(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'rc_delegations'],
  )
}

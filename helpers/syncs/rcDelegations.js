import { pool } from "../database.js"
import JSONbig from 'json-bigint'
import { validateAccountName } from "../validateUsername.js"
// Need this to handle large RC numbers
const JSONparser = JSONbig({ storeAsString: true }).parse

export const syncRCDelegations = async () => {
  const intervalTime = 3000
  setInterval(() => {
    fillRCDelegations(1000)
  }, intervalTime)
}

export const fillRCDelegations = async (limit = 10000) => {
  let start = await pool.query('SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;', ['rc_delegations'])
  start = start.rows[0].last_op_id
  let delegations = await getRCDelegations(start, limit)
  let i = 0
  while (delegations.length > 0) {
    await insertRCDelegations(delegations[i])
    i++
    if (i >= delegations.length) {
      i = 0
      const start = delegations[delegations.length - 1].op_id
      await updateLastOpId(start)
      delegations = await getRCDelegations(start, limit)
    }
  }
}
// 	"[0,{"from":"mahdiyari","delegatees":["gtg"],"max_rc":1889000000, "test": 11}]"
const getRCDelegations = async (start, limit = 10000) => {
  const result = await pool.query(`SELECT op_id, json FROM hafsql."TxCustomJson"
    WHERE id=$1 AND op_id > $2 ORDER BY op_id ASC LIMIT $3`, ['rc', start, limit])
  if (result.rowCount <= 0) {
    return []
  }
  // Validating RC delegtaion
  const delegationsArray = []
  for (let i = 0; i < result.rowCount; i++) {
    const rcDelegation = result.rows[i]
    try {
      const parsedJson = JSONparser(rcDelegation.json)
      if (!Array.isArray(parsedJson)) {
        continue
      }
      if (parsedJson.length !== 2) {
        continue
      }
      if (parsedJson[0] !== 'delegate_rc' && parsedJson[0] !== 0) {
        continue
      }
      // If the transaction is included in the block, at this point we can assume it is valid
      const from = parsedJson[1].from
      const delegatees = parsedJson[1].delegatees
      let maxRC = parsedJson[1].max_rc
      if (typeof maxRC === 'undefined' || maxRC === null) {
        maxRC = '0'
      }
      delegationsArray.push({from, delegatees, maxRC, op_id: rcDelegation.op_id})
    } catch (e) {
      continue
    }
  }
  return delegationsArray
}

const insertRCDelegations = async ( delegation ) => {
  const {maxRC} = delegation
  const from = clearUsername(delegation.from)
  const delegatees = [...new Set(delegation.delegatees)]
  for (let i = 0; i < delegatees.length; i++) {
    const delegatee = clearUsername(delegatees[i])
    // if (validateAccountName(from) || validateAccountName(delegatee)) {
    //   console.error(from, delegatee)
    //   throw new Error('Bad username')
    // }
    if (maxRC === '0' || maxRC === 0) {
      await pool.query(`DELETE FROM hafsql.rc_delegations_table
        WHERE delegator=$1 AND delegatee=$2;`, [from, delegatee])
    } else {
      await pool.query(`INSERT INTO hafsql.rc_delegations_table (delegator, delegatee, rc)
        VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_rc_delegations_table_un
        DO UPDATE SET rc=$3;`, [from, delegatee, maxRC])
    }
  }
  return true
}

const clearUsername = (username) => {
  let temp = username.replaceAll('\t', '')
  return temp.replaceAll('\r', '')
}

const updateLastOpId = async (opId) => {
  return pool.query(`UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;`, [opId, 'rc_delegations'])
}

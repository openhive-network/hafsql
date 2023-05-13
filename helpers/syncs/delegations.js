import { pool } from "../database.js"

// {
//   op_id: '77027028',
//   timestamp: 2017-04-01T00:38:12.000Z,
//   delegator: 'thecyclist',
//   delegatee: 'berniesanders',
//   vesting_shares: '{"nai": "@@000000037", "amount": "947265824000000", "precision": 6}'
// }
export const syncDelegations = async () => {
  const intervalTime = 3000
  setInterval(() => {
    fillDelegations(1000)
  }, intervalTime)
}

export const fillDelegations = async (limit = 20000) => {
  let start = await pool.query('SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;', ['delegations'])
  start = start.rows[0].last_op_id
  let delegations = await getDelegations(start, limit)
  let i = 0
  while (delegations.rowCount > 0) {
    await insertDelegations(delegations.rows[i])
    i++
    if (i >= delegations.rowCount) {
      i = 0
      const start = delegations.rows[delegations.rowCount - 1].op_id
      await updateLastOpId(start)
      delegations = await getDelegations(start, limit)
    }
  }
}

const getDelegations = async (start, limit = 10000) => {
  return pool.query('SELECT * FROM hafsql."TxDelegateVestingShares" WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2', [start, limit])
}

const insertDelegations = async ( delegation ) => {
  const {delegator, delegatee, vesting_shares} = delegation
  let vests = JSON.parse(vesting_shares).amount
  if (vests === '0') {
    return pool.query(`DELETE FROM hafsql.delegations_table
      WHERE delegator=$1 AND delegatee=$2;`, [delegator, delegatee])
  }
  vests = vests.slice(0, -6) + '.' + vests.slice(-6)
  return pool.query(`INSERT INTO hafsql.delegations_table (delegator, delegatee, vests)
    VALUES ($1, $2, $3) ON CONFLICT ON CONSTRAINT hafsql_delegations_table_un
    DO UPDATE SET vests=$3;`, [delegator, delegatee, vests])
}

const updateLastOpId = async (opId) => {
  return pool.query(`UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;`, [opId, 'delegations'])
}

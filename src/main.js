import { pool } from "../helpers/database.js"

import { config } from "dotenv"
config()

// pool.query('SELECT id, name FROM hive.operation_types WHERE is_virtual = true').then(res => {
//   const vops = {}
//   for (const vo of res.rows) {
//     vops[vo.name.replace('hive::protocol::', '')] = vo.id
//   }
//   console.log(vops)
// })
// const CONCURRENTLY = process.env.CONCURRENTLY === 'true' ? 'CONCURRENTLY' : ''
// console.log(CONCURRENTLY)

const fillDelegations = async () => {
  let delegations = await getDelegations(0, 10000)
  // console.log(delegations.rowCount)
  // console.log(delegations.rows)
  let i = 0
  // {
  //   op_id: '77027028',
  //   timestamp: 2017-04-01T00:38:12.000Z,
  //   delegator: 'thecyclist',
  //   delegatee: 'berniesanders',
  //   vesting_shares: '{"nai": "@@000000037", "amount": "947265824000000", "precision": 6}'
  // }

  let k = 0
  while (delegations.rowCount > 0) {
    await insertDelegations(delegations.rows[i])
    i++
    if (i >= delegations.rowCount) {
      i = 0
      k += 20000
      const start = delegations.rows[delegations.rowCount - 1].op_id
      delegations = await getDelegations(start, 20000)
      console.log('Processing the next set... ' + k)
    }
  }
  pool.end()
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

fillDelegations()
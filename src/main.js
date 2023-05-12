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
  console.log(delegations.rowCount)
  // console.log(delegations.rows)
  // while (delegations.rowCount) {
    
  // }
  pool.end()
}

const getDelegations = async (start, limit = 10000) => {
  return pool.query('SELECT * FROM hafsql."TxDelegateVestingShares" WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2', [start, limit])
}

const insertDelegations = async () => {
  return pool.query(`INSERT INTO hafsql.delegations_table (delegator, delegatee, vests)
    VALUES ($1, $2, $3)`)
}

fillDelegations()
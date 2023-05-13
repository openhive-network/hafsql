import { pool } from "../helpers/database.js"

import { config } from "dotenv"
import { fillDelegations, syncDelegations } from "../helpers/syncs/delegations.js"
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

const main = async () => {
  console.log('Syncing old data...')
  await fillDelegations()
  console.log('Synced the old data. Starting live sync...')
  syncDelegations()
}

main()
// ["delegate_rc",{"from":"mahdiyari","delegatees":["gtg"],"max_rc":1800000000}]


// fillDelegations()


import { pool } from "../helpers/database.js"

import { config } from "dotenv"
import { fillDelegations, syncDelegations } from "../helpers/syncs/delegations.js"
import { fillRCDelegations, syncRCDelegations } from "../helpers/syncs/rcDelegations.js"
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
  const now = Date.now()
  console.log('Syncing old data...')
  await fillDelegations()
  console.log('Syncing old RC data...')
  await fillRCDelegations()

  const timeSpent = (Date.now() - now) / 1000
  console.log('Sync done in ' + timeSpent / 60 + ' minutes. Live sync started...')
  syncDelegations()
  syncRCDelegations()
}

main()
// ["delegate_rc",{"from":"mahdiyari","delegatees":["gtg"],"max_rc":1800000000}]


// fillDelegations()


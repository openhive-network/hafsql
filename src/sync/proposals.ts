import { pool } from '../helpers/database.ts'
import { print } from '../helpers/print.ts'
import { sleep } from '../helpers/sleep.ts'
import {
  ApprovalsAndExpired,
  ExpiredAccount,
  LastOpId,
  ProposalApprovals,
} from '../helpers/types.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Proposals] Start massive sync... 🚀')
      syncProposalApprovals()
    }
  }
}

let firstRun = true
const syncProposalApprovals = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillProposalApprovals(50000)
    print('[Proposals] Massive sync done ✅')
    print('[Proposals] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillProposalApprovals(20000)
  await sleep(intervalTime)
  syncProposalApprovals()
}

const fillProposalApprovals = async (limit: number) => {
  const client = await pool.connect()
  const startQ = await client.queryObject<LastOpId>(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['proposal_approvals'],
  )
  client.release()
  let start = startQ.rows[0].last_op_id
  let data = await getData(start, limit)
  while (data.length > 0) {
    await insertData(data)
    start = data[data.length - 1].op_id
    await updateLastOpId(start)
    data = await getData(start, limit)
  }
}

// Merge approvals and expirations together and return them sorted by op_id
const getData = async (start: bigint, limit: number) => {
  using client = await pool.connect()
  const approvalResult = await client.queryObject<ProposalApprovals>(
    `SELECT op_id, voter, proposal_ids, approve FROM hafsql.op_update_proposal_votes
      WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2;`,
    [
      start,
      limit,
    ],
  )
  const upperLimit = approvalResult.rows[approvalResult.rows.length - 1]?.op_id

  let query = `SELECT op_id, account FROM hafsql.vo_expired_account_notification
    WHERE op_id <= $1 AND op_id > $2 ORDER BY op_id ASC LIMIT $3;`
  let params = [
    upperLimit,
    start,
    limit,
  ]
  // if no approvals, don't need the upper limit
  if (!upperLimit) {
    query = `SELECT op_id, account FROM hafsql.vo_expired_account_notification
      WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2;`
    params = [
      start,
      limit,
    ]
  }
  const expiredResult = await client.queryObject<ExpiredAccount>(query, params)
  // Hold results in tempArray for sorting later
  const tempArray: ApprovalsAndExpired[] = []
  for (let i = 0; i < approvalResult.rows.length; i++) {
    tempArray.push({ ...approvalResult.rows[i], type: 'approval' })
  }
  for (let i = 0; i < expiredResult.rows.length; i++) {
    tempArray.push({ ...expiredResult.rows[i], type: 'expired' })
  }
  tempArray.sort((a, b) => {
    if (a.op_id > b.op_id) {
      return 1
    } else if (a.op_id < b.op_id) {
      return -1
    } else {
      return 0
    }
  })
  return tempArray
}

const insertData = async (data: ApprovalsAndExpired[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_proposal_approvals_sync')
  await trx.begin()
  for (let i = 0; i < data.length; i++) {
    const { type } = data[i]
    if (type === 'proposal') {
      const { voter, approve } = data[i]
      // For TS typings have to do this way but surly will be valid
      const proposal_ids = data[i].proposal_ids || []
      for (let i = 0; i < proposal_ids.length; i++) {
        if (approve === 'false') {
          await trx.queryObject(
            'DELETE FROM hafsql.proposal_approvals_table WHERE id=$1 AND voter=$2;',
            [proposal_ids[i], voter],
          )
        } else {
          await trx.queryObject(
            `INSERT INTO hafsql.proposal_approvals_table (id, voter)
              VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_proposal_approvals_table_un
              DO NOTHING;`,
            [proposal_ids[i], voter],
          )
        }
      }
    } else {
      // Governance votes expired
      await trx.queryObject(
        `DELETE FROM hafsql.proposal_approvals_table WHERE voter=$1;`,
        [data[i].account],
      )
    }
  }
  await trx.commit()
}

const updateLastOpId = async (opId: bigint) => {
  using client = await pool.connect()
  return client.queryObject(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'proposal_approvals'],
  )
}

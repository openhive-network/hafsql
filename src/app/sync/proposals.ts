import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import {
  ApprovalsAndExpired,
  ExpiredAccount,
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
      print('[Proposals] Start massive sync... ⏳')
      syncProposalApprovals()
    }
  }
}

let firstRun = true
const syncProposalApprovals = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillProposalApprovals()
    print('[Proposals] Massive sync done ✅')
    print('[Proposals] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillProposalApprovals()
  await sleep(intervalTime)
  syncProposalApprovals()
}

const fillProposalApprovals = async () => {
  let blockRange = await getBlockRange('proposal_approvals')
  while (blockRange) {
    const data = await getData(blockRange)
    await insertData(data, blockRange)
    blockRange = await getBlockRange('proposal_approvals')
  }
}

// Merge approvals and expirations together and return them sorted by op_id
const getData = async (blockRange: number[]) => {
  using client = await pool.connect()
  const approvalResult = await client.queryObject<ProposalApprovals>(
    `SELECT id, voter, proposal_ids, approve FROM hafsql.operation_update_proposal_votes_table
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY id ASC;`,
    [blockRange[0], blockRange[1]],
  )
  const expiredResult = await client.queryObject<ExpiredAccount>(
    `SELECT id, account FROM hafsql.operation_expired_account_notification_table
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY id ASC;`,
    [blockRange[0], blockRange[1]],
  )
  // Hold results in tempArray for sorting later
  const tempArray: ApprovalsAndExpired[] = []
  for (let i = 0; i < approvalResult.rows.length; i++) {
    tempArray.push({ ...approvalResult.rows[i], type: 'approval' })
  }
  for (let i = 0; i < expiredResult.rows.length; i++) {
    tempArray.push({ ...expiredResult.rows[i], type: 'expired' })
  }
  tempArray.sort((a, b) => {
    if (a.id > b.id) {
      return 1
    } else if (a.id < b.id) {
      return -1
    } else {
      return 0
    }
  })
  return tempArray
}

const insertData = async (
  data: ApprovalsAndExpired[],
  blockRange: number[],
) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_proposal_approvals_sync')
  await trx.begin()
  for (let i = 0; i < data.length; i++) {
    const { type } = data[i]
    if (type === 'approval') {
      const { voter, approve } = data[i]
      // For TS typings have to do this way but surly will be valid
      const proposal_ids = data[i].proposal_ids || []
      for (let i = 0; i < proposal_ids.length; i++) {
        if (approve === false) {
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
  await updateLastBlockNum('proposal_approvals', blockRange[1], trx)
  await trx.commit()
}

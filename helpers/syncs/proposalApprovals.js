import { pool } from '../database.js'

export const syncProposalApprovals = async () => {
  const intervalTime = 3000
  setInterval(() => {
    fillProposalApprovals(1000)
  }, intervalTime)
}

export const fillProposalApprovals = async (limit = 20000) => {
  let start = await pool.query(
    'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
    ['proposal_approvals']
  )
  start = start.rows[0].last_op_id
  let approvals = await getProposalApprovals(start, limit)
  let i = 0
  while (approvals.rowCount > 0) {
    await insertProposalApprovals(approvals.rows[i])
    i++
    if (i >= approvals.rowCount) {
      i = 0
      const start = approvals.rows[approvals.rowCount - 1].op_id
      await updateLastOpId(start)
      approvals = await getProposalApprovals(start, limit)
    }
  }
}

const getProposalApprovals = async (start, limit = 10000) => {
  return pool.query(
    `SELECT op_id, voter, proposal_ids, approve FROM hafsql.op_update_proposal_votes
      WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2`,
    [start, limit]
  )
}

const insertProposalApprovals = async (approval) => {
  const { voter, approve } = approval
  const proposalIds = approval.proposal_ids
  for (let i = 0; i < proposalIds.length; i++) {
    if (approve === 'false') {
      await pool.query(
        'DELETE FROM hafsql.proposal_approvals_table WHERE id=$1 AND voter=$2;',
        [proposalIds[i], voter]
      )
    } else {
      await pool.query(
        `INSERT INTO hafsql.proposal_approvals_table (id, voter)
          VALUES ($1, $2) ON CONFLICT ON CONSTRAINT hafsql_proposal_approvals_table_un
          DO NOTHING;`,
        [proposalIds[i], voter]
      )
    }
  }
}

const updateLastOpId = async (opId) => {
  return pool.query(
    'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
    [opId, 'proposal_approvals']
  )
}

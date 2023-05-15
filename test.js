import { pool } from './helpers/database.js'

const test = async () => {
  const res = await pool.query('SELECT op_id, voter, proposal_ids, approve FROM hafsql."TxUpdateProposalVotes" LIMIT 10')
  console.log(res.rows[0])
}
test()

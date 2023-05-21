import { pool } from './helpers/database.js'

const test = async () => {
  const res = await pool.query('SELECT length(body) FROM hafsql."TxComment" x order by op_id DESC LIMIT 100000')
  console.log(res.rows[0])
}
test()

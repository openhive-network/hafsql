import { pool } from './helpers/database.js'

const test = async () => {
  let size = 0
  const res = await pool.query('SELECT length(body) as test1 FROM hafsql."TxComment" x order by op_id asc LIMIT 100000')
  for (let i = 0; i < res.rowCount; i++) {
    size += res.rows[i].test1
  }
  console.log(size)
}
test()

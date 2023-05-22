import { pool } from './helpers/database.js'
import { applyPatches, parsePatch } from '@sanity/diff-match-patch'

const test = async () => {
  const res = await pool.query(
    'SELECT x.body FROM hafsql."TxComment" x WHERE author =$1 and permlink=$2 ORDER BY op_id ASC',
    ['mahdiyari', 'hive-twitter-community']
  )
  let original = res.rows[0].body
  for (let i = 1; i < res.rowCount; i++) {
    const [temp] = applyPatches(parsePatch(res.rows[i].body), original)
    original = temp
  }
  console.log(original)
}
test()

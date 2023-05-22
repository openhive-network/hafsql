import { pool } from './helpers/database.js'
import { applyPatches, parsePatch } from '@sanity/diff-match-patch'

const res = await pool.query(
  'SELECT x.body FROM hafsql."TxComment" x WHERE author =$1 and permlink=$2 ORDER BY op_id ASC',
  ['mahdiyari', 'hive-twitter-community']
)

const test = async () => {
  let original = res.rows[0].body
  for (let i = 1; i < res.rowCount; i++) {
    const [temp] = applyPatches(parsePatch(res.rows[i].body), original)
    original = temp
  }
  // console.log(original)
}

const nowTime = Date.now()
for (let i = 0; i < 1000000; i++) {
  test()
}
console.log((Date.now() - nowTime))

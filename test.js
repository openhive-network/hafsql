// import pg from 'pg'
import { pool } from './helpers/database.js'
// import DiffMatchPatch from 'diff-match-patch'
// import { diff_match_patch as Dmp } from './helpers/dmp.js'

// const res = await pool.query(
//   'SELECT x.body FROM hafsql."TxComment" x WHERE author =$1 and permlink=$2 ORDER BY op_id ASC',
//   ['mahdiyari', 'hive-twitter-community']
// )

// 20s
// const test = async () => {
//   let original = res.rows[0].body
//   for (let i = 1; i < res.rowCount; i++) {
//     const [temp] = applyPatches(parsePatch(res.rows[i].body), original)
//     original = temp
//   }
//   // console.log(original)
// }

// 11s
// const test = async () => {
//   try {
//     const dmp = new DiffMatchPatch()
//     // let original = res.rows[0].body
//     // for (let i = 1; i < res.rowCount; i++) {
//     const patch = dmp.patch_fromText(p2)
//     const [temp] = dmp.patch_apply(patch, original)
//     // original = temp
//     // }
//     console.log(temp)
//     // console.log(original)
//   } catch {
//     console.log('didnt patch')
//   }
// }

// const original = `<center>![hivetwitter3.jpg](https://images.hive.blog/DQmUim2ktqCow2F2wtNKT6L2VUFARvH5B5JQs5dVGCrgsvB/hivetwitter3.jpg)</center>
// Short tweets.
// Max 280 characters.
// For longer tweets and threads use comments under your tweet post.
// (everything else just like twitter.com)

// Let's make it fun. Please follow the rules.

// Also looking for MODs to remove long blogs submitted to the community.`

// const p1 = `@@ -377,8 +377,47 @@
//  mmunity.
// +%0A%0Ahttps://hive.blog/created/hive-113882
// `

// const p2 = 'DELETED COMMENT'

// const test = async () => {
//   const dmp = new Dmp()
//   // const patch = dmp.patch_fromText(p1)
//   // const [temp] = dmp.patch_apply(patch, original)
//   // console.log(temp)
//   let original = res.rows[0].body
//   for (let i = 1; i < res.rowCount; i++) {
//     const patch = dmp.patch_fromText(res.rows[i].body)
//     const [temp] = dmp.patch_apply(patch, original)
//     original = temp
//   }
//   // console.log(original)
// }

// const nowTime = Date.now()
// for (let i = 0; i < 1; i++) {
//   test()
// }
// console.log((Date.now() - nowTime))
// const t = `u0000u0001u0002u0003u0004u0005u0006u0007b
// console.log(pg.types.getTypeParser(pg.types.builtins.VARCHAR)(t))
// // vwxyz{|}~ ¡¢£¤¥¦§¨

// const data = '}~ ¡¢'
const t = await pool.query('select body from hafsql.comments_table where id=1')
const b = t.rows[0].body
pool.query('UPDATE hafsql.comments_table SET body=$1 WHERE id=2', [b])

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

// function cleanString (input) {
//   let output = ''
//   for (let i = 0; i < input.length; i++) {
//     if (input.charCodeAt(i) !== 0) {
//       output += input.charAt(i)
//     }
//   }
//   return output
// }

// // const data = '}~ ¡¢'
// const t = await pool.query('select body from hafsql."TxComment" where author=$1 and permlink=$2 ORDER BY op_id ASC', ['mahdiyari', 'how-to-build-and-run-a-hive-node-witnessseedconsensus-and-account-history-nodes'])
// const b = t.rows[0].body
// const b2 = t.rows[1].body
// const dmp = new DiffMatchPatch()
// const patch = dmp.patch_fromText(b2)
// const [temp] = dmp.patch_apply(patch, b)
// // console.log(String.raw`${b}`)
// // console.log(String.raw`${b2}`)
// console.log(cleanString(temp))
const t1 = Date.now()
await pool.query('select x.blacklister FROM hafsql.blacklists_table x where blacklister = 1129328 and blacklisted =9936905565641')
console.log(Date.now() - t1)

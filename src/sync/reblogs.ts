import { pool } from '../helpers/database.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { CustomJson, ReblogsArray } from '../helpers/types.ts'
import {
	clearUsername,
	validateAccountName,
} from '../helpers/functions/validate_username.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import { getLastBlockNum } from '../helpers/functions/get_last_block_num.ts'
import { getUserId } from '../helpers/functions/get_user_id.ts'
import { getPostId } from '../helpers/functions/get_post_id.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[Reblogs] Syncing alongside with comments 🟢')
			syncReblogs()
		}
	}
}

const syncReblogs = async () => {
	const intervalTime = 250
	await fillReblogs()
	await sleep(intervalTime)
	syncReblogs()
}

const fillReblogs = async () => {
	let blockRange = await getBlockRange('reblogs')
	if (!blockRange) {
		return
	}
	while (blockRange && (blockRange[1] - blockRange[0] > 0)) {
		const reblogs = await getReblogs(blockRange)
		// blockRange[1] can be changed in getReblogs and the change will reflect here
		// which is what we want
		await insertReblogs(reblogs, blockRange)
		blockRange = await getBlockRange('reblogs')
	}
}

// Get custom_json ops and validate if they are valid reblogs
const getReblogs = async (blockRange: number[]) => {
	// reblogs start at block 4568614 - tables
	const end = await getLastBlockNum('comments')
	// Always lag behind the comments_table indexing
	if (blockRange[0] > end) {
		return []
	}
	if (blockRange[1] > end) {
		blockRange[1] = end
	}
	// block 5999998 - op_id 25769795186065408
	// Before this ^ objects were valid but after it has to be array
	// Postgres doesn't like OR, IN(), =ANY() so we use UNION ALL
	const client = await pool.connect()
	const result = await client.queryObject<CustomJson>(
		`(SELECT op_id, json, required_posting_auths, id FROM hafsql.op_custom_json
			WHERE id = 'follow' AND op_id >= hafsql.last_op_id_from_block_num($1)
			AND op_id <= hafsql.last_op_id_from_block_num($2)
			AND CASE WHEN op_id > 25769795186065408
			THEN (hafsql.to_json(json) ->> 0) = 'reblog'
			ELSE TRUE END)
		UNION ALL
		(SELECT op_id, json, required_posting_auths, id FROM hafsql.op_custom_json
			WHERE id = 'reblog' AND op_id >= hafsql.last_op_id_from_block_num($1)
			AND op_id <= hafsql.last_op_id_from_block_num($2)
			AND CASE WHEN op_id > 25769795186065408
			THEN (hafsql.to_json(json) ->> 0) = 'reblog'
			ELSE TRUE END)
		ORDER BY op_id ASC`,
		[blockRange[0], blockRange[1]],
	)
	client.release()
	const length = result.rows.length
	if (length < 1) {
		return []
	}
	const reblogsArray: ReblogsArray[] = []
	for (let i = 0; i < length; i++) {
		const customJson = result.rows[i]
		if (!isJsonString(customJson.json)) {
			continue
		}
		let parsedJson = JSON.parse(customJson.json)
		const postingAuths = customJson.required_posting_auths
		if (!Array.isArray(parsedJson)) {
			if (
				typeof parsedJson !== 'object' ||
				customJson.op_id > BigInt('25769795186065408')
			) { // block 5999998
				continue
			}
			parsedJson = [customJson.id, parsedJson]
		}
		// valid:
		// ["reblog",{"account":"user","author":"user","permlink":"link"}]
		if (parsedJson.length !== 2) {
			continue
		}
		if (parsedJson[0] !== 'reblog') {
			continue
		}
		if (typeof parsedJson[1] !== 'object') {
			continue
		}
		const keys = Object.keys(parsedJson[1])
		if (keys.length !== 3 && keys.length !== 4) {
			continue
		}
		if (
			!Object.hasOwn(parsedJson[1], 'account') ||
			!Object.hasOwn(parsedJson[1], 'author') ||
			!Object.hasOwn(parsedJson[1], 'permlink')
		) {
			continue
		}
		const { account, author, permlink } = parsedJson[1]
		let remove = false
		if (
			Object.hasOwn(parsedJson[1], 'delete') &&
			parsedJson[1].delete === 'delete'
		) {
			remove = true
		}
		if (validateAccountName(clearUsername(account))) {
			continue
		}
		if (validateAccountName(clearUsername(author))) {
			continue
		}
		if (postingAuths[0] !== clearUsername(account)) {
			continue
		}
		if (typeof permlink !== 'string' || permlink.length > 256) {
			continue
		}
		const accountId = await getUserId(account)
		if (!accountId) {
			continue
		}
		const postId = await getPostId(author, permlink)
		if (!postId) {
			continue
		}
		reblogsArray.push({
			account: accountId,
			post: postId,
			remove,
			op_id: customJson.op_id,
		})
	}
	return reblogsArray
}

const insertReblogs = async (
	reblogsArray: ReblogsArray[],
	blockRange: number[],
) => {
	using client = await pool.connect()
	const trx = client.createTransaction('reblogs_sync')
	await trx.begin()
	for (let i = 0; i < reblogsArray.length; i++) {
		const { account, post, remove } = reblogsArray[i]
		if (!remove) {
			await trx.queryObject(
				`INSERT INTO hafsql.reblogs_table (account, post) VALUES ($1, $2)
    			ON CONFLICT ON CONSTRAINT hafsql_reblogs_table_un DO NOTHING;`,
				[account, post],
			)
		} else {
			await trx.queryObject(
				'DELETE FROM hafsql.reblogs_table WHERE account=$1 AND post=$2;',
				[account, post],
			)
		}
	}
	await updateLastBlockNum('reblogs', blockRange[1], trx)
	await trx.commit()
}

const isJsonString = (str: string) => {
	try {
		JSON.parse(str)
	} catch (_e) {
		return false
	}
	return true
}

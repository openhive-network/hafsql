import { pool } from '../helpers/database.ts'
import { print } from '../helpers/print.ts'
import { sleep } from '../helpers/sleep.ts'
import { CustomJson, LastOpId, ReblogsArray } from '../helpers/types.ts'
import {
	clearUsername,
	validateAccountName,
} from '../helpers/validate_username.ts'

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
	await fillReblogs(100000)
	await sleep(intervalTime)
	syncReblogs()
}

let accountCache: Record<string, number> = {}
let postCache: Record<string, number> = {}

const clearCache = () => {
	accountCache = {}
	postCache = {}
}
// every 10min clear cache
setInterval(() => clearCache(), 600000)

const fillReblogs = async (limit: number) => {
	const client = await pool.connect()
	const startQ = await client.queryObject<LastOpId>(
		'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
		['reblogs'],
	)
	client.release()
	let start = startQ.rows[0].last_op_id
	let reblogs = await getReblogs(start, limit)
	while (reblogs.length > 0) {
		await insertReblogs(reblogs)
		start = reblogs[reblogs.length - 1].op_id
		await updateLastOpId(start)
		reblogs = await getReblogs(start, limit)
	}
}

// Get custom_json ops and validate if they are valid reblogs
const getReblogs = async (start: bigint, limit: number) => {
	if (start < BigInt('19622047718047744')) { // block 4568614
		start = BigInt('19622047718047744')
	}
	const client = await pool.connect()
	const endQ = await client.queryObject<{ last_op_id: bigint }>(
		'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
		['comments'],
	)
	const end = endQ.rows[0].last_op_id
	// Always lag behind the comments_table indexing
	const result = await client.queryObject<CustomJson>(
		`SELECT op_id, json, required_posting_auths, id FROM hafsql.op_custom_json
      WHERE id IN('follow', 'reblog') AND op_id > $1 AND op_id <= $2 ORDER BY op_id ASC LIMIT $3`,
		[start, end, limit],
	)
	client.release()
	const length = result.rows.length
	if (length <= 0) {
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

const insertReblogs = async (reblogsArray: ReblogsArray[]) => {
	using client = await pool.connect()
	const trx = client.createTransaction('reblogs_sync')
	await trx.begin()
	await trx.queryObject('SET lock_timeout=60000;')
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
	await trx.commit()
}

const getPostId = async (author: string, permlink: string) => {
	const postString = author + ';' + permlink
	if (Object.hasOwn(postCache, postString)) {
		return postCache[postString]
	} else {
		using client = await pool.connect()
		const idQ = await client.queryObject<{ id: number }>(
			'SELECT id FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
			[author, permlink],
		)
		if (idQ.rows.length < 1) {
			return null
		}
		const id = idQ.rows[0].id
		postCache[postString] = id
		return id
	}
}

const getUserId = async (username: string) => {
	if (Object.hasOwn(accountCache, username)) {
		return accountCache[username]
	} else {
		using client = await pool.connect()
		const idQ = await client.queryObject<{ id: number }>(
			'SELECT id FROM hive.accounts WHERE name=$1',
			[username],
		)
		if (idQ.rows.length < 1) {
			return null
		}
		const id = idQ.rows[0].id
		accountCache[username] = id
		return id
	}
}

const isJsonString = (str: string) => {
	try {
		JSON.parse(str)
	} catch (_e) {
		return false
	}
	return true
}

const updateLastOpId = async (opId: bigint) => {
	using client = await pool.connect()
	return client.queryObject(
		'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
		[opId, 'reblogs'],
	)
}

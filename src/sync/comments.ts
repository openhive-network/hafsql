import { pool } from '../helpers/database.ts'
import { DiffMatchPatch, Transaction } from '../deps.ts'
import { print } from '../helpers/print.ts'
import {
	AuthorPermlink,
	CommentObj,
	CommentOp,
	DeletedComment,
	LastOpId,
} from '../helpers/types.ts'
import { sleep } from '../helpers/sleep.ts'
import { createCommentsIndexes } from '../indexes/hafsql.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[Comments] Start massive sync... 🚀')
			syncComments()
			syncDeletedComments()
		}
	}
}

// TODO: This dies somehow?????
// Probably fixed, probably
let firstRun = true
const syncComments = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillComments(20000)
		print('[Comments] Massive sync done ✅')
		print('[Comments] Creating indexes... 🚀')
		await createCommentsIndexes()
		print('[Comments] Indexes have been created ✅')
		print('[Comments] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillComments(20000)
	await sleep(intervalTime)
	syncComments()
}

const fillComments = async (limit: number) => {
	const client = await pool.connect()
	const startQ = await client.queryObject<LastOpId>(
		'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
		['comments'],
	)
	client.release()
	let start = startQ.rows[0].last_op_id
	let comments = await getComments(start, limit)
	while (comments.length > 0) {
		await insertComments(comments)
		start = comments[comments.length - 1].op_id
		comments = await getComments(start, limit)
		await updateLastOpId(start)
	}
}

// Get comment operations from hive.operations
const getComments = async (start: bigint, limit: number) => {
	using client = await pool.connect()
	const result = await client.queryObject<CommentOp>(
		`SELECT op_id, "timestamp", author, permlink, parent_author, parent_permlink, title, body, json_metadata
      FROM hafsql.op_comment WHERE op_id > $1 ORDER BY op_id ASC LIMIT $2`,
		[start, limit],
	)
	return result.rows
}

let retry = 0
// Create a transaction then insert or update comments
const insertComments = async (comments: CommentOp[]) => {
	using client = await pool.connect()
	// use transaction to speed up inserts
	const trx = client.createTransaction('hafsql_comments_sync')
	await trx.begin()
	try {
		for (let i = 0; i < comments.length; i++) {
			await insertComment(comments[i], trx)
		}
		await trx.commit()
		retry = 0
	} catch (e) {
		if (retry > 5) {
			throw new Error(e)
		}
		// if (client.session.current_transaction) {
		// 	await trx.rollback()
		// }
		retry++
		await sleep(1000)
		await insertComments(comments)
	}
}

const insertComment = async (comment: CommentOp, trx: Transaction) => {
	const oldComment = await getComment(comment.author, comment.permlink, trx)
	if (oldComment !== null) {
		// edited comments
		return updateEditedComment(comment, oldComment, trx)
	}
	// new comments
	const tags = extractTags(comment.json_metadata)
	const metadata = isJsonString(comment.json_metadata)
		? comment.json_metadata
		: {}
	await trx.queryObject(
		`INSERT INTO hafsql.comments_table
      (title, body, tags, author, permlink, parent_author, parent_permlink, metadata, created)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[
			comment.title,
			comment.body,
			JSON.stringify(tags),
			comment.author,
			comment.permlink,
			comment.parent_author,
			comment.parent_permlink,
			JSON.stringify(metadata),
			comment.timestamp,
		],
	)
}

// Handle edited posts
const updateEditedComment = async (
	comment: CommentOp,
	oldComment: CommentObj,
	trx: Transaction,
) => {
	const params: {
		name: string
		value: string | object
	}[] = []
	const tags = extractTags(comment.json_metadata)
	const metadata = isJsonString(comment.json_metadata)
		? comment.json_metadata
		: {}
	if (tags.join() !== oldComment.tags.join()) {
		params.push({ name: 'tags', value: JSON.stringify(tags) })
	}
	if (JSON.stringify(metadata) !== JSON.stringify(oldComment.metadata)) {
		params.push({ name: 'metadata', value: JSON.stringify(metadata) })
	}
	const oldBody = comment.body
	const newBody = oldComment.body
	if (oldBody.length > 0 && oldBody !== newBody) {
		const editedBody = patchBody(oldBody, newBody)
		params.push({ name: 'body', value: editedBody })
	}
	if (comment.title !== oldComment.title) {
		params.push({ name: 'title', value: comment.title })
	}
	if (params.length < 1) {
		return
	}
	let addedQuery = ''
	const queryParams: Array<string | object> = []
	params.forEach((value, index) => {
		addedQuery += `${value.name}=$${index + 1}`
		queryParams.push(value.value)
		if (index !== params.length - 1) {
			addedQuery += `,`
		}
	})
	await trx.queryObject(
		`UPDATE hafsql.comments_table SET ${addedQuery}
      WHERE id=${oldComment.id}`,
		queryParams,
	)
}

// Get comment from the comments_table
const getComment = async (
	author: string,
	permlink: string,
	trx: Transaction,
) => {
	const result = await trx.queryObject<CommentObj>(
		'SELECT id, title, body, tags, metadata FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
		[author, permlink],
	)
	if (result?.rowCount && result?.rowCount > 0) {
		return result.rows[0]
	}
	return null
}

// Extract tags from metadata
const extractTags = (jsonMetadata: string) => {
	try {
		const temp = []
		if (typeof jsonMetadata === 'string' && jsonMetadata.length > 0) {
			const parsedJson = JSON.parse(jsonMetadata)
			if (Object.hasOwn(parsedJson, 'tags')) {
				const tags = parsedJson.tags
				if (Array.isArray(tags)) {
					for (let i = 0; i < tags.length; i++) {
						if (tags[i].length <= 24) {
							temp.push(cleanString(tags[i]))
						}
						if (i > 10) {
							break
						}
					}
				}
			}
		}
		return temp
	} catch {
		return []
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

// Charcode 0 is invalid for Postgres
const cleanString = (input: string) => {
	let output = ''
	for (let i = 0; i < input.length; i++) {
		if (input.charCodeAt(i) !== 0) {
			output += input.charAt(i)
		}
	}
	return output
}

// Apply edits to the body of the post/comment
const patchBody = (oldBody: string, newBody: string) => {
	try {
		const dmp = new DiffMatchPatch()
		const patch = dmp.patch_fromText(newBody)
		const [temp] = dmp.patch_apply(patch, oldBody)
		return temp
	} catch {
		return newBody
	}
}

const updateLastOpId = async (opId: bigint) => {
	using client = await pool.connect()
	await client.queryObject(
		'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
		[opId, 'comments'],
	)
}

/**
 ********** Delted comments handling ***********
 * This won't go past the synced comments
 * Will always lag behind
 */

const syncDeletedComments = async () => {
	// 10s should be enough to not be spammy during reindex
	// 3s might be better to also feel better during live sync
	// TODO: test and adjust
	const intervalTime = 3000
	await fillDeleted(100000)
	await sleep(intervalTime)
	syncDeletedComments()
}

const fillDeleted = async (limit: number) => {
	await getIneffectiveDeleteComments()
	const client = await pool.connect()
	const startQ = await client.queryObject<{ last_op_id: bigint }>(
		'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
		['delete_comments'],
	)
	client.release()
	let start = startQ.rows[0].last_op_id
	let deletedCms = await getDeletedComments(start, limit)
	while (deletedCms.length > 0) {
		await insertDeletedComments(deletedCms)
		start = deletedCms[deletedCms.length - 1].op_id
		await updateLastOpIdDeleted(start)
		deletedCms = await getDeletedComments(start, limit)
	}
}

// Comments that didn't get deleted despite having a delete operation
let notDeletedComments: AuthorPermlink[] = []
const getIneffectiveDeleteComments = async () => {
	using client = await pool.connect()
	const result = await client.queryObject<AuthorPermlink>(
		'SELECT author, permlink FROM hafsql.vo_ineffective_delete_comment',
	)
	if (result.rows.length > 0) {
		notDeletedComments = result.rows
	}
}

const getDeletedComments = async (start: bigint, limit: number) => {
	using client = await pool.connect()
	const endQ = await client.queryObject<LastOpId>(
		'SELECT last_op_id FROM hafsql.sync_data WHERE table_name=$1;',
		['comments'],
	)
	const end = endQ.rows[0].last_op_id
	// Always lag behind the comments_table indexing
	const result = await client.queryObject<DeletedComment>(
		`SELECT op_id, author, permlink FROM hafsql.op_delete_comment
      WHERE op_id > $1 AND op_id <= $2 ORDER BY op_id ASC LIMIT $3`,
		[start, end, limit],
	)
	return result.rows
}

let retry1 = 0
const insertDeletedComments = async (deletedCms: DeletedComment[]) => {
	using client = await pool.connect()
	const trx = client.createTransaction('deleted_comments_sync')
	try {
		await trx.begin()
		for (let i = 0; i < deletedCms.length; i++) {
			const { author, permlink } = deletedCms[i]
			let notDeleted = false
			for (let k = 0; k < notDeletedComments.length; k++) {
				if (
					author === notDeletedComments[k].author &&
					permlink === notDeletedComments[k].permlink
				) {
					notDeleted = true
				}
			}
			if (notDeleted) {
				continue
			}
			await trx.queryObject(
				'UPDATE hafsql.comments_table SET deleted=true WHERE author=$1 AND permlink=$2;',
				[author, permlink],
			)
		}
		await trx.commit()
		retry1 = 0
	} catch (e) {
		// probably a deadlock - retry
		if (retry1 > 5) {
			throw new Error(e)
		}
		retry1++
		await sleep(2000)
		await insertDeletedComments(deletedCms)
	}
}

const updateLastOpIdDeleted = async (opId: bigint) => {
	using client = await pool.connect()
	await client.queryObject(
		'UPDATE hafsql.sync_data SET last_op_id=$1 WHERE table_name=$2;',
		[opId, 'delete_comments'],
	)
}

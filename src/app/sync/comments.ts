import { pool } from '../helpers/database.ts'
import { DiffMatchPatch, Transaction } from '../../deps.ts'
import { print } from '../helpers/utils/print.ts'
import {
	AuthorPermlink,
	CommentObj,
	CommentOp,
	DeletedComment,
	RootAuthorPermlink,
} from '../helpers/types.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import {
	createCommentsIndexes,
	createHafsqlIndexes,
} from '../indexes/hafsql.ts'
import { cleanString } from '../helpers/utils/clean_string.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { getLastBlockNum } from '../helpers/utils/get_last_block_num.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[Comments] Start massive sync... ⏳')
			syncComments()
			syncDeletedComments()
		}
	}
}

// TODO: This dies somehow?????
// Probably fixed, probably
// Nope not fixed
let firstRun = true
const syncComments = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillComments()
		print('[Comments] Massive sync done ✅')
		print('[Comments] Creating indexes... ⏳')
		await createCommentsIndexes()
		// At this point other syncs should be done/near end as well
		await createHafsqlIndexes()
		print('[Comments] Indexes have been created ✅')
		print('[Comments] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillComments()
	await sleep(intervalTime)
	syncComments()
}

const fillComments = async () => {
	let blockRange = await getBlockRange('comments')
	while (blockRange) {
		const comments = await getComments(blockRange)
		await insertComments(comments, blockRange)
		blockRange = await getBlockRange('comments')
	}
}

// Get comment operations from hive.operations
const getComments = async (blockRange: number[]) => {
	using client = await pool.connect()
	const result = await client.queryObject<CommentOp>(
		`SELECT "timestamp", author, permlink, parent_author, parent_permlink, title, body, json_metadata
      FROM hafsql.operation_comment_view
			WHERE id >= hafsql.first_op_id_from_block_num($1)
			AND id <= hafsql.last_op_id_from_block_num($2)
			ORDER BY id ASC`,
		[blockRange[0], blockRange[1]],
	)
	return result.rows
}

// Create a transaction then insert or update comments
const insertComments = async (comments: CommentOp[], blockRange: number[]) => {
	using client = await pool.connect()
	// use transaction to speed up inserts
	const trx = client.createTransaction('hafsql_comments_sync')
	await trx.begin()
	try {
		for (let i = 0; i < comments.length; i++) {
			await insertComment(comments[i], trx)
		}
		await updateLastBlockNum('comments', blockRange[1], trx)
		await trx.commit()
		// deno-lint-ignore no-explicit-any
	} catch (e: any) {
		if (e.cause?.message === 'deadlock detected') {
			console.log('deadlock comments')
			await sleep(5000)
			return insertComments(comments, blockRange)
		} else {
			print(e)
			throw new Error(e)
		}
	}
}

const insertComment = async (comment: CommentOp, trx: Transaction) => {
	const oldComment = await getComment(comment.author, comment.permlink, trx)
	if (oldComment !== null) {
		// edited comments
		await updateEditedComment(comment, oldComment, trx)
		return
	}
	// new comments
	const tags = extractTags(comment.json_metadata)
	// already validated in the view by hafsql.to_json()
	const metadata = JSON.stringify(comment.json_metadata)

	// Root of a post is itself
	let rootAuthor = comment.author
	let rootPermlink = comment.permlink
	if (
		typeof comment.parent_author === 'string' &&
		comment.parent_author.length > 0
	) {
		// if there is a parent, grab its roots
		const result = await trx.queryObject<RootAuthorPermlink>(
			`SELECT root_author, root_permlink
				FROM hafsql.comments_table WHERE author=$1 and permlink=$2`,
			[comment.parent_author, comment.parent_permlink],
		)
		rootAuthor = result.rows[0].root_author
		rootPermlink = result.rows[0].root_permlink
	}
	await trx.queryObject(
		`INSERT INTO hafsql.comments_table
      (title, body, tags, author, permlink, parent_author, parent_permlink, metadata, created, root_author, root_permlink)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		[
			comment.title,
			comment.body,
			JSON.stringify(tags),
			comment.author,
			comment.permlink,
			comment.parent_author,
			comment.parent_permlink,
			metadata,
			comment.timestamp,
			rootAuthor,
			rootPermlink,
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
	const metadata = comment.json_metadata
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
	params.push({ name: 'last_edited', value: comment.timestamp })

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
// deno-lint-ignore no-explicit-any
const extractTags = (parsedJson: any) => {
	try {
		const temp = []
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
	await fillDeleted()
	await sleep(intervalTime)
	syncDeletedComments()
}

const fillDeleted = async () => {
	await getIneffectiveDeleteComments()
	let blockRange = await getBlockRange('delete_comments')
	while (blockRange) {
		const deletedCms = await getDeletedComments(blockRange)
		await insertDeletedComments(deletedCms, blockRange)
		blockRange = await getBlockRange('delete_comments')
	}
}

// Comments that didn't get deleted despite having a delete operation
let notDeletedComments: AuthorPermlink[] = []
const getIneffectiveDeleteComments = async () => {
	using client = await pool.connect()
	const result = await client.queryObject<AuthorPermlink>(
		'SELECT author, permlink FROM hafsql.operation_ineffective_delete_comment_table',
	)
	if (result.rows.length > 0) {
		notDeletedComments = result.rows
	}
}

const getDeletedComments = async (blockRange: number[]) => {
	using client = await pool.connect()
	const end = await getLastBlockNum('comments')
	// Always lag behind the comments_table indexing
	if (blockRange[0] > end) {
		blockRange[0] = end
		blockRange[1] = end
		return []
	}
	if (blockRange[1] > end) {
		blockRange[1] = end
	}
	const result = await client.queryObject<DeletedComment>(
		`SELECT id, author, permlink FROM hafsql.operation_delete_comment_table
      WHERE id >= hafsql.first_op_id_from_block_num($1)
			AND id <= hafsql.last_op_id_from_block_num($2)
			ORDER BY id ASC`,
		[blockRange[0], blockRange[1]],
	)
	return result.rows
}

const insertDeletedComments = async (
	deletedCms: DeletedComment[],
	blockRange: number[],
) => {
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
		await updateLastBlockNum('delete_comments', blockRange[1], trx)
		await trx.commit()
		// deno-lint-ignore no-explicit-any
	} catch (e: any) {
		// probably a deadlock - retry
		if (e.cause?.message === 'deadlock detected') {
			await sleep(5000)
			return insertDeletedComments(deletedCms, blockRange)
		} else {
			print(e)
			throw new Error(e)
		}
	}
}

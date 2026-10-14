import { DiffMatchPatch } from '../../deps.ts'
import { print } from '../helpers/utils/print.ts'
import {
	CommentObj,
	CommentOp,
	DeletedComment,
	RootAuthorPermlink,
} from '../helpers/types.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { createCommentsIndexes } from '../indexes/hafsql_indexes.ts'
import { cleanString } from '../helpers/utils/clean_string.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { getLastBlockNum } from '../helpers/utils/get_last_block_num.ts'
import { customClient, query, transaction } from '../helpers/database.ts'

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
		await repairRecreatedComments()
		await fillComments()
		print('[Comments] Massive sync done ✅')
		print('[Comments] Creating indexes... ⏳')
		await createCommentsIndexes()
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

type DeleteOp = DeletedComment & { type: 'delete' }

// Get comment and effective delete operations, merged in op order
// Deletes are handled here (not in a separate worker) so a re-post after a delete is seen in order
const getComments = async (blockRange: number[]) => {
	const comments = await query<CommentOp>(
		`SELECT id, "timestamp", author, permlink, parent_author, parent_permlink, title, body, json_metadata
      FROM hafsql.operation_comment_view
			WHERE id >= hafsql.first_op_id_from_block_num($1)
			AND id <= hafsql.last_op_id_from_block_num($2)
			ORDER BY id ASC`,
		[blockRange[0], blockRange[1]],
	)
	const deletes = await query<DeletedComment>(
		`SELECT d.id, d.author, d.permlink FROM hafsql.operation_delete_comment_table d
			WHERE d.id >= hafsql.first_op_id_from_block_num($1)
			AND d.id <= hafsql.last_op_id_from_block_num($2)
			AND ${effectiveDelete}
			ORDER BY d.id ASC`,
		[blockRange[0], blockRange[1]],
	)
	const ops: (CommentOp | DeleteOp)[] = [
		...comments.rows,
		...deletes.rows.map((d) => ({ ...d, type: 'delete' as const })),
	]
	return ops.sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1)
}

// A delete_comment is ineffective when an ineffective_delete_comment follows it in the same block
const effectiveDelete = `NOT EXISTS (
	SELECT 1 FROM hafsql.operation_ineffective_delete_comment_table i
	WHERE i.author = d.author AND i.permlink = d.permlink
	AND hafd.operation_id_to_block_num(i.id) = hafd.operation_id_to_block_num(d.id))`

// Create a transaction then insert or update comments
const insertComments = async (
	comments: (CommentOp | DeleteOp)[],
	blockRange: number[],
) => {
	try {
		await transaction(async (client) => {
			for (const op of comments) {
				if ('type' in op) {
					await client.query(
						'UPDATE hafsql.comments_table SET deleted=true WHERE author=$1 AND permlink=$2;',
						[op.author, op.permlink],
					)
				} else {
					await insertComment(op, client)
				}
			}
			await updateLastBlockNum('comments', blockRange[1], client)
		})
		// deno-lint-ignore no-explicit-any
	} catch (e: any) {
		if (e.message === 'deadlock detected') {
			console.log('deadlock comments')
			await sleep(5000)
			return insertComments(comments, blockRange)
		} else {
			print(e)
			throw e
		}
	}
}

const insertComment = async (comment: CommentOp, client: customClient) => {
	const oldComment = await getComment(comment.author, comment.permlink, client)
	if (oldComment !== null && !oldComment.deleted) {
		// edited comments
		await updateEditedComment(comment, oldComment, client)
		return
	}
	if (oldComment !== null) {
		// Re-posted after a delete - it is a new comment (new id, like hivemind)
		await client.query('DELETE FROM hafsql.comments_table WHERE id=$1', [
			oldComment.id,
		])
	}
	// new comments
	const tags = extractTags(comment.json_metadata)
	// already validated in the view by hafsql.to_json()
	const metadata = JSON.stringify(comment.json_metadata)

	// Root of a post is itself
	let rootAuthor = comment.author
	let rootPermlink = comment.permlink
	let category = comment.parent_permlink
	if (
		typeof comment.parent_author === 'string' &&
		comment.parent_author.length > 0
	) {
		// if there is a parent, grab its roots
		const result = await client.query<RootAuthorPermlink>(
			`SELECT root_author, root_permlink, category
				FROM hafsql.comments_table WHERE author=$1 and permlink=$2`,
			[comment.parent_author, comment.parent_permlink],
		)
		rootAuthor = result.rows[0].root_author
		rootPermlink = result.rows[0].root_permlink
		category = result.rows[0].category
	}
	await client.query(
		`INSERT INTO hafsql.comments_table
      (title, body, tags, author, permlink, parent_author, parent_permlink, metadata, created, root_author, root_permlink, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		[
			cleanString(comment.title),
			cleanString(comment.body),
			JSON.stringify(tags),
			comment.author,
			comment.permlink,
			comment.parent_author,
			comment.parent_permlink,
			metadata,
			comment.timestamp,
			rootAuthor,
			rootPermlink,
			category,
		],
	)
}

// Handle edited posts
const updateEditedComment = async (
	comment: CommentOp,
	oldComment: CommentObj,
	client: customClient,
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
	const oldBody = oldComment.body
	const newBody = comment.body
	if (oldBody.length > 0 && oldBody !== newBody) {
		const editedBody = patchBody(oldBody, newBody)
		params.push({ name: 'body', value: cleanString(editedBody) })
	}
	// Empty title on edit means unchanged (same as hivemind)
	if (comment.title !== '' && comment.title !== oldComment.title) {
		params.push({ name: 'title', value: cleanString(comment.title) })
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
	await client.query(
		`UPDATE hafsql.comments_table SET ${addedQuery}
      WHERE id=${oldComment.id}`,
		queryParams,
	)
}

// Get comment from the comments_table
const getComment = async (
	author: string,
	permlink: string,
	client: customClient,
) => {
	const result = await client.query<CommentObj>(
		'SELECT id, title, body, tags, metadata, deleted FROM hafsql.comments_table WHERE author=$1 AND permlink=$2',
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
 * One-off repair requested by upgrade.ts (marker in hafsql.version).
 * Comments re-posted after a delete were treated as edits and stayed deleted.
 * Rebuild them by replaying their comment ops after the last effective delete.
 * Safe to re-run - repaired rows are no longer deleted.
 */
const repairRecreatedComments = async () => {
	const marker = await query(
		'SELECT 1 FROM hafsql.version WHERE name=$1',
		['repair_recreated_comments'],
	)
	if (marker.rows.length === 0) {
		return
	}
	print('[Comments] Repairing comments re-posted after delete... ⏳')
	// Don't replay ops the live sync hasn't reached - it will handle them
	const lastBlock = await getLastBlockNum('comments')
	const maxId = (await query<{ max: number }>(
		'SELECT COALESCE(MAX(id), 0) AS max FROM hafsql.comments_table',
	)).rows[0].max
	const batch = 1000000
	let repaired = 0
	for (let start = 0; start <= maxId; start += batch) {
		const rows = await query<
			{ id: number; author: string; permlink: string; last_delete: string }
		>(
			`SELECT c.id, c.author, c.permlink, ld.last_delete
				FROM hafsql.comments_table c,
				LATERAL (SELECT MAX(d.id) AS last_delete FROM hafsql.operation_delete_comment_table d
					WHERE d.author = c.author AND d.permlink = c.permlink AND ${effectiveDelete}) ld
				WHERE c.id BETWEEN $1 AND $2 AND c.deleted
				AND EXISTS (SELECT 1 FROM hafd.operations o
					WHERE o.op_type_id = 1
					AND o.body_value->>'author' = c.author AND o.body_value->>'permlink' = c.permlink
					AND o.id > ld.last_delete AND o.id <= hafsql.last_op_id_from_block_num($3))`,
			[start, start + batch - 1, lastBlock],
		)
		for (const row of rows.rows) {
			const ops = await query<CommentOp>(
				`SELECT id, "timestamp", author, permlink, parent_author, parent_permlink, title, body, json_metadata
					FROM hafsql.operation_comment_view
					WHERE author = $1 AND permlink = $2
					AND id > $3 AND id <= hafsql.last_op_id_from_block_num($4)
					ORDER BY id ASC`,
				[row.author, row.permlink, row.last_delete, lastBlock],
			)
			await transaction(async (client) => {
				// Rewards on the row belong to the re-post - a paid comment can't be deleted
				const old = (await client.query<Record<string, string>>(
					`SELECT pending_payout_value, payout, author_rewards_hive, author_rewards_hbd,
						curation_rewards, beneficiary_rewards
						FROM hafsql.comments_table WHERE id = $1 FOR UPDATE`,
					[row.id],
				)).rows[0]
				for (const op of ops.rows) {
					await insertComment(op, client)
				}
				await client.query(
					`UPDATE hafsql.comments_table SET pending_payout_value = $3, payout = $4,
						author_rewards_hive = $5, author_rewards_hbd = $6,
						curation_rewards = $7, beneficiary_rewards = $8
						WHERE author = $1 AND permlink = $2`,
					[
						row.author,
						row.permlink,
						old.pending_payout_value,
						old.payout,
						old.author_rewards_hive,
						old.author_rewards_hbd,
						old.curation_rewards,
						old.beneficiary_rewards,
					],
				)
			})
			repaired++
		}
		print(
			`[Comments] Repair: ${
				Math.min(start + batch, maxId)
			}/${maxId} - ${repaired} rebuilt`,
		)
	}
	await query('DELETE FROM hafsql.version WHERE name=$1', [
		'repair_recreated_comments',
	])
	print(`[Comments] Repair done - ${repaired} comments rebuilt ✅`)
}

import { pool } from '../helpers/database.ts'

export const createCommentsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_pending_payout_value_idx ON hafsql.comments_table USING btree (pending_payout_value);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_tags_idx ON hafsql.comments_table USING gin (tags);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_parent_author_parent_permlink_idx ON hafsql.comments_table USING btree (parent_author, parent_permlink);',
	)
	await client.queryObject(
		"CREATE INDEX IF NOT EXISTS hafsql_comments_table_metadata_idx ON hafsql.comments_table USING btree ((metadata->>'content_type'));",
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_created_idx ON hafsql.comments_table USING btree (created);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_author_created_idx ON hafsql.comments_table USING btree (author, created);',
	)
}

export const createDelegationsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_delegations_table_delegatee_idx ON hafsql.delegations_table USING btree (delegatee);',
	)
}

export const createRCDelegationsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_rc_delegations_table_delegatee_idx ON hafsql.rc_delegations_table USING btree (delegatee);',
	)
}

export const createHafsqlIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_reblogs_table_post_idx ON hafsql.reblogs_table USING btree (post);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_proposal_approvals_voter_idx ON hafsql.proposal_approvals_table USING btree (voter);',
	)

	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_votescache_table_timestamp_idx ON hafsql.votescache_table USING btree (timestamp);',
	)
}

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
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_root_author_root_permlink_idx ON hafsql.comments_table USING btree (root_author, root_permlink);',
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

export const createCommunitiesIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_proposal_approvals_voter_idx ON hafsql.proposal_approvals_table USING btree (voter);',
	)
}

export const createReputationsIndexes = async () => {
	// Might be nice to have to sort reputations from high to low
	// using client = await pool.connect()
	// await client.queryObject(
	// 	'CREATE INDEX IF NOT EXISTS hafsql_reputations_table_reputation_idx ON hafsql.reputations_table USING btree (reputation);',
	// )
}

export const createBalancesIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_table_hive_idx ON hafsql.balances_table USING btree (hive);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_table_hbd_idx ON hafsql.balances_table USING btree (hbd);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_table_vests_idx ON hafsql.balances_table USING btree (vests);',
	)
}

export const createHafsqlIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_reblogs_table_post_idx ON hafsql.reblogs_table USING btree (post);',
	)
}

import { query } from '../helpers/database.ts'

const param = (param: string, jsonb = false) => {
	if (jsonb) {
		return `(o.body_binary::jsonb->'value'->'${param}')`
	}
	return `(o.body_binary::jsonb->'value'->>'${param}')`
}
const amount = (param: string) => {
	return `hafsql.asset_amount(${param})`
}
const symbol = (param: string) => {
	return `hafsql.asset_symbol(${param})`
}
const block = (id: string) => {
	return `hafd.operation_id_to_block_num(${id})`
}

const OPs = 49

// Create views for the operations that don't have tables
export const setupOperationViews = async () => {
	// No dedicated table
	const OpVote = `CREATE OR REPLACE VIEW hafsql.operation_vote_view
    AS SELECT o.id,
      hb.created_at AS "timestamp",
      ${param('voter')} AS "voter",
      ${param('author')} AS "author",
      ${param('weight')}::int4 AS "weight",
      ${param('permlink')} AS "permlink",
      ${block('o.id')} AS "block_num",
      hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hafd.operations o
    JOIN hafd.blocks hb ON hb.num = ${block('o.id')}
    WHERE hafd.operation_id_to_type_id(o.id) = 0;`
	await query(OpVote)

	// No dedicated table
	const OpComment = `CREATE OR REPLACE VIEW hafsql.operation_comment_view
  AS SELECT o.id,
    hb.created_at AS "timestamp",
    ${param('author')} AS "author",
    ${param('permlink')} AS "permlink",
    ${param('parent_author')}::text AS "parent_author",
    ${param('parent_permlink')} AS "parent_permlink",
    ${param('title')} AS "title",
    ${param('body')} AS "body",
    hafsql.to_json(${param('json_metadata')}) AS "json_metadata",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hafd.operations o
    JOIN hafd.blocks hb ON hb.num = ${block('o.id')}
    WHERE hafd.operation_id_to_type_id(o.id) = 1;`
	await query(OpComment)

	// No dedicated table
	const OpCustomJson = `CREATE OR REPLACE VIEW hafsql.operation_custom_json_view
  AS SELECT o.id,
    hb.created_at AS "timestamp",
    ${param('required_auths', true)} AS "required_auths",
    ${param('required_posting_auths', true)} AS "required_posting_auths",
    ${param('id')} AS "custom_id",
    ${param('json')} AS "json",
    ${block('o.id')} AS "block_num",
    hafsql.get_trx_id(o.id) AS "trx_id"
    FROM hafd.operations o
    JOIN hafd.blocks hb ON hb.num = ${block('o.id')}
    WHERE hafd.operation_id_to_type_id(o.id) = 18;`
	await query(OpCustomJson)

	// +23
	// No dedicated table
	const VOEffectiveCommentVote =
		`CREATE OR REPLACE VIEW hafsql.operation_effective_comment_vote_view
    AS SELECT o.id,
      hb.created_at AS "timestamp",
      ${param('voter')} AS voter,
      ${param('author')} AS author,
      ${param('permlink')} AS permlink,
      ${param('weight')} AS weight,
      ${param('rshares')}::numeric AS rshares,
      ${param('total_vote_weight')} AS total_vote_weight,
      ${amount(param('pending_payout'))} AS pending_payout,
      ${symbol(param('pending_payout'))} AS pending_payout_symbol,
      ${block('o.id')} as block_num
    FROM hafd.operations o
    JOIN hafd.blocks hb ON hb.num = ${block('o.id')}
    WHERE hafd.operation_id_to_type_id(o.id) = ${OPs} + 23;`
	await query(VOEffectiveCommentVote)
}

export const removeOperationViews = async () => {
	const dropViews = `DROP VIEW IF EXISTS
    hafsql.operation_vote_view,
    hafsql.operation_comment_view,
    hafsql.operation_custom_json_view,
    hafsql.operation_effective_comment_vote_view
    CASCADE;`
	await query(dropViews)
}

import { queryAPI } from '../../app/helpers/database.ts'
import {
	BigJSONparser,
	BigJSONstringifier,
	isHttpError,
	Router,
} from '../../deps.ts'
import { validateBlockRange } from '../helpers/validate_block_range.ts'
import { validateLimit } from '../helpers/validate_limit.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateTypes } from '../helpers/valudate_types.ts'

export const operationsAPI = new Router()
	/**
	 * GET /operations/by-range/{types}
	 * @summary Operations in block range
	 * @description Return specified operations in a block range
	 * @tag Operations
	 * @pathParam {OperationTypes} types - Operation types e.g. transfer,comment
	 * @queryParam {string} block_range - Block range - Maximum range is 1000 blocks
	 * e.g. 5000000-5000100
	 * @response 200 - JSON array of operations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/operations/by-range/:types', async (ctx) => {
		const types = await validateTypes(ctx, ctx.params.types)
		const validKeys = ['block_range']
		validateSearchParams(ctx, validKeys, true)
		const params = ctx.request.url.searchParams
		const range = validateBlockRange(ctx, params.get('block_range'))
		try {
			const result = await getByTypes(types, range)
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (e) {
			if (isHttpError(e)) {
				throw e
			}
			return ctx.throw(400, 'Bad params provided')
		}
	})
	// Coding to allow searching all existing operations seems a bit overkill and not necessary
	// Should prioritize useful operations
	/**
	 * GET /operations/custom_json/{id}
	 * @summary custom_json
	 * @description Search custom_json operations
	 * @tag Operations
	 * @pathParam {string} id - ID parameter of the custom_json to find - we call this custom_id e.g. follow
	 * @queryParam {string} [start] - `id` (the id used in the database for sorting not the custom_id)
	 * or `block_num` used for pagination - omit to return the latest items
	 * e.g. 5000000
	 * @queryParam {string} [limit] - Max number of items to return - Can be negative to reverse the sorting
	 * - min: -1000
	 * - max: 1000
	 * - default 100
	 * e.g. 100
	 * @response 200 - JSON array of operations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/operations/custom_json/:id', async (ctx) => {
		const customId = ctx.params.id
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const params = ctx.request.url.searchParams
		const limit = validateLimit(ctx, 100, 1000)
		try {
			const result = await getCustomJson(customId, limit, params.get('start'))
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (e) {
			if (isHttpError(e)) {
				throw e
			}
			return ctx.throw(400, 'Bad params provided')
		}
	})
	/**
	 * GET /operations/transfer
	 * @summary transfer
	 * @description Search transfer operations
	 * @tag Operations
	 * @queryParam {string} [memo] - Memo to search -
	 * prefix with `%LIKE%:` for partial search with sql LIKE - For example to find all memos starting with `!poll` we can do
	 * `%LIKE%:!poll%` - This will search for results like `!poll test1234`
	 * e.g. test
	 * @queryParam {string} [from] - Username of the sender e.g. gtg
	 * @queryParam {string} [to] - Destination username e.g. gtg
	 * @queryParam {string} [start] - `id` or `block_num` used for pagination e.g. 5000000
	 * @queryParam {string} [limit] - Max number of items to return - Can be negative to reverse the sorting
	 * - min: -1000
	 * - max: 1000
	 * - default 100
	 * e.g. 100
	 * @response 200 - JSON array of operations
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/operations/transfer', async (ctx) => {
		const validKeys = ['memo', 'from', 'to', 'start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const params = ctx.request.url.searchParams
		const limit = validateLimit(ctx, 100, 1000)
		let from = null
		let to = null
		let memo = null
		if (params.has('from')) {
			from = (await validateNames(ctx, params.get('from'), 1))[0]
		}
		if (params.has('to')) {
			to = (await validateNames(ctx, params.get('to'), 1))[0]
		}
		if (params.has('memo')) {
			memo = params.get('memo')
		}
		try {
			const result = await getTransfer(
				from,
				to,
				memo,
				limit,
				params.get('start'),
			)
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (e) {
			if (isHttpError(e)) {
				throw e
			}
			return ctx.throw(400, 'Bad params provided')
		}
	})

const getByTypes = async (types: string[], range: number[]) => {
	const withViews = ['vote', 'comment', 'custom_json', 'effective_comment_vote']
	// deno-lint-ignore no-explicit-any
	let allResults: any[] = []
	for (let i = 0; i < types.length; i++) {
		const type = types[i]
		let tableName = `operation_${type}`
		if (withViews.includes(type)) {
			tableName += '_view'
		} else {
			tableName += '_table'
		}
		const result = await queryAPI(
			`SELECT hafd.operation_id_to_block_num(id) AS block_num, * FROM hafsql.${tableName}
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY id`,
			range,
		)
		allResults = allResults.concat(result.rows)
	}
	allResults.sort((a, b) => a.id - b.id)
	return allResults
}

const getCustomJson = async (
	customId: string,
	limit: number,
	start: null | string,
) => {
	let condition = ''
	const params = [customId, limit < 0 ? -limit : limit]
	if (start) {
		params.push(start)
		if (Number(start) < 2147483647) {
			if (limit < 0) {
				condition = 'AND id > hafsql.last_op_id_from_block_num($3)'
			} else {
				condition = 'AND id < hafsql.first_op_id_from_block_num($3)'
			}
		} else {
			if (limit < 0) {
				condition = 'AND id > $3'
			} else {
				condition = 'AND id < $3'
			}
		}
	}
	let orderby = 'ORDER BY id DESC'
	if (limit < 0) {
		orderby = 'ORDER BY id ASC'
	}
	const result = await queryAPI(
		`SELECT * FROM hafsql.operation_custom_json_view
			WHERE custom_id=$1 ${condition} ${orderby} LIMIT $2`,
		params,
	)
	return result.rows
}

const getTransfer = async (
	from: null | string,
	to: null | string,
	memo: null | string,
	limit: number,
	start: null | string,
) => {
	let i = 2
	let condition = ''
	// deno-lint-ignore no-explicit-any
	const params: any[] = [limit < 0 ? -limit : limit]
	if (from) {
		condition += `from_account = $${i}`
		i++
		params.push(from)
	}
	if (to) {
		if (condition !== '') {
			condition += ' AND '
		}
		condition += `to_account = $${i}`
		i++
		params.push(to)
	}
	if (memo) {
		if (condition !== '') {
			condition += ' AND '
		}
		if (memo.startsWith('%LIKE%:')) {
			memo = memo.replace('%LIKE%:', '')
			condition += `memo LIKE $${i}`
		} else {
			condition += `memo = $${i}`
		}
		i++
		params.push(memo)
	}
	if (start) {
		if (condition !== '') {
			condition += ' AND '
		}
		params.push(start)
		if (Number(start) < 2147483647) {
			if (limit < 0) {
				condition += `id > hafsql.last_op_id_from_block_num($${i})`
			} else {
				condition += `id < hafsql.first_op_id_from_block_num($${i})`
			}
		} else {
			if (limit < 0) {
				condition += `id > $${i}`
			} else {
				condition += `id < $${i}`
			}
		}
	}
	let orderby = 'ORDER BY id DESC'
	if (limit < 0) {
		orderby = 'ORDER BY id ASC'
	}
	const result = await queryAPI(
		`SELECT *, hafd.operation_id_to_block_num(id) AS block_num FROM hafsql.operation_transfer_table
			${condition !== '' ? 'WHERE ' + condition : ''} ${orderby} LIMIT $1`,
		params,
	)
	return result.rows
}

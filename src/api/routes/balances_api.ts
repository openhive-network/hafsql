import { query } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateBlockNum } from '../helpers/validate_block_num.ts'
import { validateLimit } from '../helpers/validate_limit.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateSymbol } from '../helpers/validate_symbol.ts'

const MAX_NUM = 999999999

export const balancesAPI = new Router()
	/**
	 * GET /balances/by-names
	 * @summary Balances by names
	 * @description Returns balances of the accounts.
	 * @tag Balances
	 * @queryParam {string} names - List of usernames separated by `,` e.g. mahdiyari,gtg
	 * @response 200 - A JSON array of balance objects
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/balances/by-names', async (ctx) => {
		const validKeys = ['names']
		validateSearchParams(ctx, validKeys)
		const params = ctx.request.url.searchParams
		const names = params.get('names')
		const namesArray = await validateNames(ctx, names)
		const result = await getByNames(namesArray)
		if (result.length === 0) {
			return ctx.throw(404, 'No accounts found')
		}
		return ctx.response.body = BigJSONparser(BigJSONstringifier(result))
	})
	/**
	 * GET /balances/historical/{name}/{block_num}
	 * @summary Historical balances
	 * @description Returns balances of the account at certain block_num.
	 * @tag Balances
	 * @pathParam {string} name - Username e.g. gtg
	 * @pathParam {string} block_num - Block number e.g. 5000000
	 * @response 200 - A JSON object of balances
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/balances/historical/:name/:block_num', async (ctx) => {
		const username = ctx.params.name
		await validateNames(ctx, username, 1)
		const blockNum = validateBlockNum(ctx, ctx.params.block_num)
		const result = await getHistoricBalance(username, blockNum)
		if (result.length === 0) {
			return ctx.throw(404, 'No accounts found')
		}
		return ctx.response.body = BigJSONparser(BigJSONstringifier(result[0]))
	})
	/**
	 * GET /balances/rich-list/{symbol}
	 * @summary Rich list
	 * @description Returns the top holders of a certain token.
	 * @tag Balances
	 * @pathParam {Symbol} symbol - Token symbol e.g. hive
	 * @queryParam {integer} [limit=100] - Max number of returned items<br/>
	 * <sub>min: 1 | max: 1000</sub>
	 * @response 200 - A JSON object of balances
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/balances/rich-list/:symbol', async (ctx) => {
		const symbol = ctx.params.symbol
		validateSymbol(ctx, symbol)
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const params = ctx.request.url.searchParams
		let limit = 100
		if (params.has('limit')) {
			const limitStr = params.get('limit')
			validateLimit(ctx, limitStr, 1000, 1)
			limit = Number(limitStr)
		}
		const result = await getRichList(symbol, limit)
		if (result.length === 0) {
			return ctx.throw(404, 'No accounts found')
		}
		return ctx.response.body = BigJSONparser(BigJSONstringifier(result))
	})
	/**
	 * GET /balances/total-balances
	 * @summary Total balances
	 * @description Returns the historical sum of account balances computed daily.<br/>
	 * Note: Pending balances such as pending convert or pending escrow are not taken into account.
	 * @tag Balances
	 * @queryParam {integer} [start] - Block number used for pagination
	 * @queryParam {integer} [limit=100] - Max number of returned items -
	 * Can be negative for going backwards and to reverse the sorting<br/>
	 * <sub>min: -1000 | max: 1000</sub>
	 * @response 200 - A JSON object of balances
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/balances/total-balances', async (ctx) => {
		const validKeys = ['start', 'limit']
		validateSearchParams(ctx, validKeys, false)
		const params = ctx.request.url.searchParams
		let limit = 100
		if (params.has('limit')) {
			const limitStr = params.get('limit')
			validateLimit(ctx, limitStr, 1000)
			limit = Number(limitStr)
		}
		let num = MAX_NUM
		if (params.has('start')) {
			const start = params.get('start')
			num = validateBlockNum(ctx, start)
		}
		const result = await getTotalBalances(num, limit)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(BigJSONstringifier(result))
	})

// Keep database connections in a separate context so they can be release on errors

const getByNames = async (namesArray: string[]) => {
	let queryStr = ''
	for (let i = 0; i < namesArray.length; i++) {
		if (i !== 0) {
			queryStr += 'UNION ALL\n'
		}
		queryStr += `SELECT * FROM hafsql.balances WHERE account_name=$${i + 1}\n`
	}
	const result = await query(queryStr, namesArray)
	return result.rows
}

const getHistoricBalance = async (username: string, blockNum: number) => {
	const result = await query(
		'SELECT * FROM hafsql.get_balance($1, $2)',
		[username, blockNum],
	)
	return result.rows
}

const getRichList = async (symbol: string, limit: number) => {
	const result = await query(
		`SELECT * FROM hafsql.balances 
      ORDER BY ${symbol} DESC
      LIMIT $1`,
		[limit],
	)
	return result.rows
}

const getTotalBalances = async (num: number, limit: number) => {
	const result = await query(
		`SELECT *,
      (SELECT timestamp FROM hafsql.haf_blocks WHERE block_num=tb.block_num)
      FROM hafsql.total_balances tb
      WHERE block_num
      ${limit < 0 && num !== MAX_NUM ? '> $1' : '< $1'}
      ORDER BY block_num ${limit < 0 ? 'ASC' : 'DESC'}
      LIMIT $2`,
		[num, limit < 0 ? -limit : limit],
	)
	return result.rows
}

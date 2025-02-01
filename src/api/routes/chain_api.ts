import { queryAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'
import { validateBlockNum } from '../helpers/validate_block_num.ts'
import { validateTrxId } from '../helpers/validate_trx_id.ts'

export const chainAPI = new Router()
	/**
	 * GET /chain/dynamic-global-properties
	 * @summary Dynamic Global Properties
	 * @description Returns dynamic_global_properties optionally at a certain block number.
	 * @tag Chain API
	 * @queryParam {integer} [block_num=0] - Block number to get the historical values
	 * for that block number
	 * @response 200 - A JSON object
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {object} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/chain/dynamic-global-properties', async (ctx) => {
		const validKeys = ['block_num']
		validateSearchParams(ctx, validKeys, false)
		const params = ctx.request.url.searchParams
		let blockNum = 0
		if (params.has('block_num')) {
			blockNum = validateBlockNum(ctx, params.get('block_num'))
		}
		const result = await getDynamicGlobalProps(blockNum)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result[0]),
		)
	})
	/**
	 * GET /chain/block/{block_num}
	 * @summary Get Block
	 * @description Returns the block information
	 * @tag Chain API
	 * @pathParam {integer} block_num - Block number - 0 to get the head block
	 * e.g. 5000000
	 * @queryParam {boolean} [include_trx=false]
	 * - Set true to include transactions in the returned result
	 * @response 200 - A JSON object
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {object} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/chain/block/:block_num', async (ctx) => {
		const blockNum = validateBlockNum(ctx, ctx.params.block_num)
		const params = ctx.request.url.searchParams
		const validKeys = ['include_trx']
		validateSearchParams(ctx, validKeys, false)
		let includeTrx = false
		if (params.has('include_trx')) {
			if (params.get('include_trx') === 'true') {
				includeTrx = true
			}
		}
		const result = await getBlock(blockNum, includeTrx)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result[0]),
		)
	})
	/**
	 * GET /chain/transactions/{block_num}
	 * @summary Get Transactions
	 * @description Returns the transactions included in a block
	 * @tag Chain API
	 * @pathParam {integer} block_num - Block number
	 * e.g. 5000000
	 * @queryParam {boolean} [include_ops=false]
	 * - Set true to include operations in the returned result
	 * @response 200 - Array of transaction object
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/chain/transactions/:block_num', async (ctx) => {
		const blockNum = validateBlockNum(ctx, ctx.params.block_num)
		const params = ctx.request.url.searchParams
		const validKeys = ['include_ops']
		validateSearchParams(ctx, validKeys, false)
		let includeOps = false
		if (params.has('include_ops')) {
			if (params.get('include_ops') === 'true') {
				includeOps = true
			}
		}
		const result = await getTransactions(blockNum, includeOps)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})
	/**
	 * GET /chain/transaction/{trx_id}
	 * @summary Find Transaction
	 * @description Returns the transaction information including the operations
	 * @tag Chain API
	 * @pathParam {string} trx_id - Transaction id
	 * e.g. 6707feb450da66dc223ab5cb3e259937b2fef6bf
	 * @response 200 - A JSON object
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {object} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/chain/transaction/:trx_id', async (ctx) => {
		const trxId = validateTrxId(ctx, ctx.params.trx_id)
		const result = await findTransaction(trxId)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result[0]),
		)
	})
	/**
	 * GET /chain/operations/{block_num}
	 * @summary Get Operations
	 * @description Returns the operations included in a block. This doesn't include transaction information (see "Get Transactions" for that).
	 * @tag Chain API
	 * @pathParam {string} block_num - Block number
	 * e.g. 5000000
	 * @queryParam {boolean} [legacy_format=true]
	 * - By default will return in the legacy format i.e arrays and formatted assets like `1.000 HIVE`
	 * <br>Set to `false` to return in the object format and assets as nai
	 * @response 200 - Array of operations
	 * @response 400 - Bad request value
	 * @response 404 - No items found
	 * @responseContent {array[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 * @responseContent {NoItemFound} 404.application/json
	 */
	.get('/chain/operations/:block_num', async (ctx) => {
		const blockNum = validateBlockNum(ctx, ctx.params.block_num)
		const params = ctx.request.url.searchParams
		const validKeys = ['legacy_format']
		validateSearchParams(ctx, validKeys, false)
		let legacyFormat = true
		if (params.has('legacy_format')) {
			if (params.get('legacy_format') === 'false') {
				legacyFormat = false
			}
		}
		const result = await getOperations(blockNum, legacyFormat)
		if (result.length === 0) {
			return ctx.throw(404, 'No items found')
		}
		return ctx.response.body = BigJSONparser(
			BigJSONstringifier(result),
		)
	})

// Helper functions
const getDynamicGlobalProps = async (blockNum = 0) => {
	let condition
	if (blockNum > 0) {
		condition = 'WHERE block_num = $1'
	} else {
		condition = 'ORDER BY block_num DESC LIMIT 1'
	}
	const result = await queryAPI(
		`SELECT * FROM hafsql.dynamic_global_properties ${condition}`,
		blockNum > 0 ? [blockNum] : [],
	)
	return result.rows
}

const getBlock = async (blockNum: number, includeTrx: boolean) => {
	let condition
	if (blockNum > 0) {
		condition = 'WHERE block_num = $1'
	} else {
		condition = 'ORDER BY block_num DESC LIMIT 1'
	}
	if (!includeTrx) {
		const result = await queryAPI(
			`SELECT * FROM hafsql.haf_blocks ${condition}`,
			blockNum > 0 ? [blockNum] : [],
		)
		return result.rows
	}
	const result = await queryAPI(
		`SELECT * FROM hafsql.haf_blocks ${condition}`,
		blockNum > 0 ? [blockNum] : [],
	)
	const trxs = await getTransactions(result.rows[0].block_num, true)
	const temp = { ...result.rows[0] }
	temp['transactions'] = trxs
	return [temp]
}

const getTransactions = async (blockNum: number, includeOps: boolean) => {
	if (includeOps) {
		const result = await queryAPI(
			`SELECT block_num, hafsql.get_timestamp(block_num) AS timestamp, trx_in_block,
			trx_id, ref_block_num, ref_block_prefix, expiration, signatures,
			(SELECT ARRAY_AGG(hive.get_legacy_style_operation(hafd.operation_from_jsontext(body::text))) 
				FROM hafsql.haf_operations ho
				WHERE ho.block_num = t.block_num
				AND ho.trx_in_block = t.trx_in_block) AS operations
			FROM hafsql.haf_transactions t
			WHERE block_num = $1`,
			[blockNum],
		)
		return result.rows
	}
	const result = await queryAPI(
		`SELECT block_num, hafsql.get_timestamp(block_num) AS timestamp, trx_in_block,
		trx_id, ref_block_num, ref_block_prefix, expiration, signatures
		FROM hafsql.haf_transactions t
		WHERE block_num = $1`,
		[blockNum],
	)
	return result.rows
}

const findTransaction = async (trxId: string) => {
	const result = await queryAPI(
		`SELECT block_num, hafsql.get_timestamp(block_num) AS timestamp, trx_in_block,
			trx_id, ref_block_num, ref_block_prefix, expiration, signatures,
			(SELECT ARRAY_AGG(hive.get_legacy_style_operation(hafd.operation_from_jsontext(body::text))) 
				FROM hafsql.haf_operations ho
				WHERE ho.block_num = t.block_num
				AND ho.trx_in_block = t.trx_in_block) AS operations
			FROM hafsql.haf_transactions t
			WHERE trx_hash = decode($1, 'hex')`,
		[trxId],
	)
	return result.rows
}

const getOperations = async (blockNum: number, isLegacy: boolean) => {
	if (isLegacy) {
		const result = await queryAPI(
			`SELECT hive.get_legacy_style_operation(hafd.operation_from_jsontext(body::text)) as operation
				FROM hafsql.haf_operations ho
				WHERE ho.block_num = $1`,
			[blockNum],
		)
		if (result.rows.length === 0) {
			return []
		}
		const temp = []
		for (let i = 0; i < result.rows.length; i++) {
			temp.push(result.rows[i].operation)
		}
		return temp
	}
	const result = await queryAPI(
		`SELECT body as operation
			FROM hafsql.haf_operations ho
			WHERE ho.block_num = $1`,
		[blockNum],
	)
	if (result.rows.length === 0) {
		return []
	}
	const temp = []
	for (let i = 0; i < result.rows.length; i++) {
		temp.push(result.rows[i].operation)
	}
	return temp
}

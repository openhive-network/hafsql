import { queryAPI } from '../../app/helpers/database.ts'
import { BigJSONparser, BigJSONstringifier, Router } from '../../deps.ts'
import { validateId } from '../helpers/validate_id.ts'
import { validateInteger } from '../helpers/validate_integer.ts'
import { validateLimit } from '../helpers/validate_limit.ts'
import { validateNames } from '../helpers/validate_names.ts'
import { validateSearchParams } from '../helpers/validate_search_params.ts'

export const marketAPI = new Router()
	/**
	 * GET /market/orderbook
	 * @summary Get Orderbook
	 * @description Returns order book.
	 * @tag Market
	 * @queryParam {integer} [decimals=6] - Number of decimal points to group orders in.
	 * - Min: 1
	 * - Max: 6
	 * e.g. 6
	 * @queryParam {integer} [limit=50] - Max number of items in the sell and buy orderbook.
	 * - Min: 1
	 * - Max: 200
	 * e.g. 50
	 * @response 200 - A JSON array of orderbook
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/market/orderbook', async (ctx) => {
		const limit = validateLimit(ctx, 50, 200, 1)
		const params = ctx.request.url.searchParams
		validateSearchParams(ctx, ['decimals', 'limit'], false)
		const decimals = validateInteger(ctx, params.get('decimals'), 6, 6, 1)
		try {
			const result = await getOrderbook(decimals, limit)
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (_e) {
			return ctx.throw(400, 'Bad params provided')
		}
	})
	/**
	 * GET /market/open-orders/{username}
	 * @summary Open Orders
	 * @description Returns open orders of a user.
	 * @tag Market
	 * @pathParam {string} username - Account username e.g. mahdiyari
	 * @response 200 - A JSON array of open orders
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/market/open-orders/:username', async (ctx) => {
		const names = await validateNames(ctx, ctx.params.username, 1)
		try {
			const result = await getOpenOrders(names[0])
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (_e) {
			return ctx.throw(400, 'Bad params provided')
		}
	})
	/**
	 * GET /market/all-trade-history
	 * @summary All Trade History
	 * @description Returns trade history of the market.
	 * @tag Market
	 * @queryParam {integer} [limit=100] Max number of items to return - Can be negative for reverse sorting
	 * - Min: -1000
	 * - Max: 1000
	 *  e.g. 100
	 * @queryParam {integer} [start] - ID used for pagination e.g. 21473573759616569
	 * @response 200 - A JSON array of open orders
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/market/all-trade-history', async (ctx) => {
		const params = ctx.request.url.searchParams
		validateSearchParams(ctx, ['limit', 'start'], false)
		const limit = validateLimit(ctx, 100, 1000)
		let start = null
		if (params.has('start')) {
			start = validateId(ctx, params.get('start'))
		}
		try {
			const result = await getAllTradeHistory(limit, start)
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (_e) {
			return ctx.throw(400, 'Bad params provided')
		}
	})
	/**
	 * GET /market/tickers
	 * @summary Get Tickers
	 * @description Returns basic information about the market.
	 * @tag Market
	 * @response 200 - A JSON array of orders
	 * @response 400 - Bad request value
	 * @responseContent {object[]} 200.application/json
	 * @responseContent {BadRequest} 400.application/json
	 */
	.get('/market/tickers', async (ctx) => {
		try {
			const result = await getTickers()
			return ctx.response.body = BigJSONparser(
				BigJSONstringifier(result),
			)
		} catch (_e) {
			return ctx.throw(400, 'Bad params provided')
		}
	})

const getOrderbook = async (decimals: number, limit: number) => {
	const buys = await queryAPI(
		`SELECT SUM(amount) AS hbd_amount, rate::numeric(30,${decimals}),
      (SUM(amount)/rate::numeric(30,${decimals}))::numeric(30,3) AS estimate_hive_amount
      FROM hafsql.market_open_orders_table
      WHERE symbol=$1
      GROUP BY rate::numeric(30,${decimals})
      ORDER BY rate DESC
      LIMIT $2`,
		['HBD', limit],
	)
	const sells = await queryAPI(
		`SELECT SUM(amount) AS hive_amount, rate::numeric(30,${decimals}),
      (SUM(amount)*rate::numeric(30,${decimals}))::numeric(30,3) AS estimate_hbd_amount
      FROM hafsql.market_open_orders_table
      WHERE symbol=$1
      GROUP BY rate::numeric(30,${decimals})
      ORDER BY rate ASC
      LIMIT $2`,
		['HIVE', limit],
	)
	return {
		asks: buys.rows,
		bids: sells.rows,
	}
}

const getOpenOrders = async (username: string) => {
	const result = await queryAPI(
		`SELECT *, (CASE WHEN symbol='HBD' THEN 'buy' ELSE 'sell' END) AS type FROM hafsql.market_open_orders_table
      WHERE owner=$1
      ORDER BY timestamp DESC`,
		[username],
	)
	return result.rows
}

const getAllTradeHistory = async (limit: number, start: null | string) => {
	const params: Array<string | number> = [limit < 0 ? -limit : limit]
	if (start) {
		params.push(start)
	}
	const result = await queryAPI(
		`SELECT id, current_owner, open_owner, current_orderid, open_orderid, current_pays, current_pays_symbol,
    open_pays, open_pays_symbol, hafsql.get_timestamp(id) AS timestamp
    FROM hafsql.operation_fill_order_table
    WHERE id ${
			start && limit > 0 ? '< $2' : start && limit < 0 ? '> $2' : '> 0'
		} 
    ORDER BY id ${limit > 0 ? 'DESC' : 'ASC'}
    LIMIT $1`,
		params,
	)
	return result.rows
}

const getTickers = async () => {
	// Last 24 hour trades
	const result = await queryAPI(
		`SELECT current_pays, open_pays, open_pays_symbol
    FROM hafsql.operation_fill_order_table
    WHERE id > hafsql.id_from_timestamp(NOW() AT TIME ZONE 'utc' - INTERVAL '24 hour', true)
    ORDER BY id`,
	)
	const tickers = {
		ticker_id: 'HIVE_HBD',
		base_currency: 'HIVE',
		quote_currency: 'HBD',
		last_price: 0,
		base_volume: 0,
		quote_volume: 0,
		bid: 0,
		ask: 0,
		high: 0,
		low: 0,
		price_change_percent_24h: 0,
	}
	let firstPrice = 0
	for (let i = 0; i < result.rows.length; i++) {
		const {
			current_pays,
			open_pays,
			open_pays_symbol,
		} = result.rows[i]
		if (open_pays_symbol === 'HBD') {
			tickers.quote_volume += Number(open_pays)
			tickers.base_volume += Number(current_pays)
		} else {
			tickers.quote_volume += Number(current_pays)
			tickers.base_volume += Number(open_pays)
		}
		// Skip low volume < 1 HIVE trades
		if (
			(open_pays_symbol === 'HIVE' && open_pays < 1) ||
			(open_pays_symbol === 'HBD' && current_pays < 1)
		) {
			continue
		}
		const rate = open_pays_symbol === 'HBD'
			? Number(open_pays) / Number(current_pays)
			: Number(current_pays) / Number(open_pays)

		if (firstPrice === 0) {
			firstPrice = rate
		}
		if (tickers.low === 0 || tickers.low > rate) {
			tickers.low = rate
		}
		if (tickers.high === 0 || tickers.high < rate) {
			tickers.high = rate
		}
		tickers.last_price = rate
	}
	tickers.price_change_percent_24h = Number(
		((tickers.last_price - firstPrice) * 100 / firstPrice).toFixed(2),
	)
	return tickers
}

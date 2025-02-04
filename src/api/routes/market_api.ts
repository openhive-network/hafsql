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

// Though not an expensive call but caching would help reduce number of calls
// Cache for 3 seconds
const tickerCache = {
	timestamp: 0,
	tickers: {},
}
const getTickers = async () => {
	const now = Date.now()
	if (tickerCache.timestamp !== 0 && now - tickerCache.timestamp < 3000) {
		return tickerCache.tickers
	}
	// Last 24 hour trades
	const volums = await queryAPI(
		`SELECT SUM(CASE WHEN open_pays_symbol = 'HIVE' THEN open_pays ELSE current_pays END) AS base_vol,
		SUM(CASE WHEN open_pays_symbol = 'HIVE' THEN current_pays ELSE open_pays END) AS quote_vol
    FROM hafsql.operation_fill_order_table
    WHERE id > hafsql.id_from_timestamp(NOW() AT TIME ZONE 'utc' - INTERVAL '24 hour', true)`,
	)
	const first = await queryAPI(
		`SELECT current_pays, open_pays, open_pays_symbol 
    FROM hafsql.operation_fill_order_table
    WHERE id > hafsql.id_from_timestamp(NOW() AT TIME ZONE 'utc' - INTERVAL '24 hour', true)
    AND open_pays > 2
    ORDER BY id ASC
    LIMIT 1`,
	)
	const last = await queryAPI(
		`SELECT current_pays, open_pays, open_pays_symbol 
    FROM hafsql.operation_fill_order_table
    WHERE id > hafsql.id_from_timestamp(NOW() AT TIME ZONE 'utc' - INTERVAL '24 hour', true)
    AND open_pays > 2
    ORDER BY id DESC
    LIMIT 1`,
	)
	const low = await queryAPI(
		`SELECT low FROM hafsql.market_bucket_5m_table 
		WHERE timestamp > NOW() AT TIME ZONE 'utc' - INTERVAL '24 hour'
		ORDER BY low ASC
		LIMIT 1`,
	)
	const high = await queryAPI(
		`SELECT high FROM hafsql.market_bucket_5m_table 
		WHERE timestamp > NOW() AT TIME ZONE 'utc' - INTERVAL '24 hour'
		ORDER BY high DESC
		LIMIT 1`,
	)
	const orderbook = await getOrderbook(6, 1)
	const firstPrice = first.rows[0].open_pays_symbol === 'HBD'
		? Number(first.rows[0].open_pays) / Number(first.rows[0].current_pays)
		: Number(first.rows[0].current_pays) / Number(first.rows[0].open_pays)
	const lastPrice = last.rows[0].open_pays_symbol === 'HBD'
		? Number(last.rows[0].open_pays) / Number(last.rows[0].current_pays)
		: Number(last.rows[0].current_pays) / Number(last.rows[0].open_pays)
	const tickers = {
		ticker_id: 'HIVE_HBD',
		base_currency: 'HIVE',
		quote_currency: 'HBD',
		last_price: lastPrice.toFixed(6),
		base_volume: volums.rows[0].base_vol,
		quote_volume: volums.rows[0].quote_vol,
		bid: orderbook.bids[0].rate,
		ask: orderbook.asks[0].rate,
		high: high.rows[0].high,
		low: low.rows[0].low,
		price_change_percent_24h: Number(
			((lastPrice - firstPrice) * 100 / firstPrice).toFixed(2),
		),
	}
	tickerCache.timestamp = Date.now()
	tickerCache.tickers = tickers
	return tickers
}

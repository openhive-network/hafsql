import { customClient, query, transaction } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { createMarketIndexes } from '../indexes/hafsql_indexes.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[Market] Start massive sync... ⏳')
			syncMarket()
		}
	}
}

let firstRun = true
const syncMarket = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillMarket()
		print('[Market] Massive sync done ✅')
		await createMarketIndexes()
		print('[Market] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillMarket()
	await sleep(intervalTime)
	syncMarket()
}

const fillMarket = async () => {
	let blockRange = await getBlockRange('market')
	while (blockRange) {
		const data = await getData(blockRange)
		await insertData(data, blockRange)
		blockRange = await getBlockRange('market')
	}
}

const getData = async (blockRange: number[]) => {
	const limitCreate = await query(
		`SELECT id, owner, orderid, amount_to_sell, min_to_receive, amount_to_sell_symbol, expiration,
		hafsql.get_timestamp(id) AS timestamp, 'limitCreate' AS type
    FROM hafsql.operation_limit_order_create_table
    WHERE id >= hafsql.first_op_id_from_block_num($1)
    AND id <= hafsql.last_op_id_from_block_num($2)
    ORDER BY id ASC`,
		blockRange,
	)
	const limitCreate2 = await query(
		`SELECT id, owner, orderid, amount_to_sell, amount_to_sell_symbol, exchange_rate_base, exchange_rate_base_symbol,
		exchange_rate_quote, expiration, hafsql.get_timestamp(id) AS timestamp, 'limitCreate2' AS type
    FROM hafsql.operation_limit_order_create2_table
    WHERE id >= hafsql.first_op_id_from_block_num($1)
    AND id <= hafsql.last_op_id_from_block_num($2)
    ORDER BY id ASC`,
		blockRange,
	)
	const fillOrder = await query(
		`SELECT id, current_owner, open_owner, current_orderid, open_orderid, current_pays, open_pays,
		open_pays_symbol, hafsql.get_timestamp(id) AS timestamp, 'fillOrder' AS type
    FROM hafsql.operation_fill_order_table
    WHERE id >= hafsql.first_op_id_from_block_num($1)
    AND id <= hafsql.last_op_id_from_block_num($2)
    ORDER BY id ASC`,
		blockRange,
	)
	const limitCancelled = await query(
		`SELECT id, seller, orderid, 'limitCancelled' AS type
    FROM hafsql.operation_limit_order_cancelled_table
    WHERE id >= hafsql.first_op_id_from_block_num($1)
    AND id <= hafsql.last_op_id_from_block_num($2)
    ORDER BY id ASC`,
		blockRange,
	)
	// deno-lint-ignore no-explicit-any
	let temp: any[] = []
	temp = temp.concat(
		limitCreate.rows,
		limitCreate2.rows,
		fillOrder.rows,
		limitCancelled.rows,
	)
	temp.sort((a, b) => {
		if (BigInt(a.id) - BigInt(b.id) > 0) {
			return 1
		}
		if (BigInt(a.id) - BigInt(b.id) < 0) {
			return -1
		}
		return 0
	})
	return temp
}

// deno-lint-ignore no-explicit-any
const insertData = async (data: any[], blockRange: number[]) => {
	await transaction(async (client) => {
		for (const item of data) {
			if (item.type === 'limitCreate') {
				const {
					owner,
					orderid,
					amount_to_sell,
					min_to_receive,
					amount_to_sell_symbol,
					expiration,
					timestamp,
				} = item
				// HBD amount / HIVE amount = rate
				const rate = amount_to_sell_symbol === 'HBD'
					? Number(amount_to_sell) / Number(min_to_receive)
					: Number(min_to_receive) / Number(amount_to_sell)
				await client.query(
					`INSERT INTO hafsql.market_open_orders_table (expiration, timestamp, owner, orderid, amount, symbol, rate)
					VALUES ($1, $2, $3, $4, $5, $6, $7)`,
					[
						expiration,
						timestamp,
						owner,
						orderid,
						amount_to_sell,
						amount_to_sell_symbol,
						rate,
					],
				)
			}
			if (item.type === 'limitCreate2') {
				const {
					owner,
					orderid,
					amount_to_sell,
					amount_to_sell_symbol,
					exchange_rate_base,
					exchange_rate_base_symbol,
					exchange_rate_quote,
					expiration,
					timestamp,
				} = item
				// HBD amount / HIVE amount = rate
				const rate = exchange_rate_base_symbol === 'HBD'
					? Number(exchange_rate_base) / Number(exchange_rate_quote)
					: Number(exchange_rate_quote) / Number(exchange_rate_base)
				await client.query(
					`INSERT INTO hafsql.market_open_orders_table (expiration, timestamp, owner, orderid, amount, symbol, rate)
					VALUES ($1, $2, $3, $4, $5, $6, $7)`,
					[
						expiration,
						timestamp,
						owner,
						orderid,
						amount_to_sell,
						amount_to_sell_symbol,
						rate,
					],
				)
			}
			if (item.type === 'fillOrder') {
				const {
					current_owner,
					current_orderid,
					current_pays,
					open_owner,
					open_orderid,
					open_pays,
					open_pays_symbol,
					timestamp,
				} = item
				const openAmount = await client.query(
					`SELECT amount FROM hafsql.market_open_orders_table
					WHERE owner = $1 AND orderid = $2`,
					[open_owner, open_orderid],
				)
				// If remaining amount is 0 then remove the orders, otherwise update them
				if (Number(openAmount.rows[0].amount) - Number(open_pays) === 0) {
					await client.query(
						`DELETE FROM hafsql.market_open_orders_table
						WHERE owner = $1 AND orderid = $2`,
						[open_owner, open_orderid],
					)
				} else {
					await client.query(
						`UPDATE hafsql.market_open_orders_table SET amount = amount - $3
						WHERE owner = $1 AND orderid = $2`,
						[open_owner, open_orderid, open_pays],
					)
				}
				const currentAmount = await client.query(
					`SELECT amount FROM hafsql.market_open_orders_table
					WHERE owner = $1 AND orderid = $2`,
					[current_owner, current_orderid],
				)
				if (Number(currentAmount.rows[0].amount) - Number(current_pays) === 0) {
					await client.query(
						`DELETE FROM hafsql.market_open_orders_table
						WHERE owner = $1 AND orderid = $2`,
						[current_owner, current_orderid],
					)
				} else {
					await client.query(
						`UPDATE hafsql.market_open_orders_table SET amount = amount - $3
						WHERE owner = $1 AND orderid = $2`,
						[current_owner, current_orderid, current_pays],
					)
				}
				// Skip trades below 1 HIVE as it results in inaccurate price representation
				if (
					(open_pays_symbol === 'HIVE' && open_pays >= 1) ||
					(open_pays_symbol === 'HBD' && current_pays >= 1)
				) {
					// Fill buckets - used to draw charts
					await fillBuckets(
						timestamp,
						open_pays,
						current_pays,
						open_pays_symbol,
						client,
					)
				}
			}
			if (item.type === 'limitCancelled') {
				const { seller, orderid } = item
				await client.query(
					`DELETE FROM hafsql.market_open_orders_table
					WHERE owner = $1 AND orderid = $2`,
					[seller, orderid],
				)
			}
		}
		await updateLastBlockNum('market', blockRange[1], client)
	})
}

const fillBuckets = async (
	timestamp: string,
	open_pays: string,
	current_pays: string,
	open_pays_symbol: string,
	client: customClient,
) => {
	// Filling the buckets
	const rate = open_pays_symbol === 'HBD'
		? Number(open_pays) / Number(current_pays)
		: Number(current_pays) / Number(open_pays)
	const bucketSizes = ['5m', '30m', '1h', '4h', '1d', '1w', '4w']
	const bucketStarts: string[] = []
	bucketSizes.forEach((item) => {
		bucketStarts.push(getBucketStart(new Date(timestamp), item))
	})
	for (let i = 0; i < bucketStarts.length; i++) {
		const tableName = `hafsql.market_bucket_${bucketSizes[i]}_table`
		const result = await client.query(
			`SELECT high, low FROM ${tableName}
				WHERE timestamp = $1`,
			[bucketStarts[i]],
		)
		// base: hive & quote: hbd
		let baseVol = Number(open_pays)
		let quoteVol = Number(current_pays)
		if (open_pays_symbol === 'HBD') {
			baseVol = Number(current_pays)
			quoteVol = Number(open_pays)
		}
		if (result.rows.length !== 0) {
			const { high, low } = result.rows[0]
			const newHigh = rate > Number(high) ? rate : Number(high)
			const newLow = rate < Number(low) ? rate : Number(low)
			const newClose = rate
			await client.query(
				`UPDATE ${tableName} SET high=$1, low=$2, close=$3, base_vol=base_vol+$4, quote_vol=quote_vol+$5
					WHERE timestamp=$6`,
				[newHigh, newLow, newClose, baseVol, quoteVol, bucketStarts[i]],
			)
		} else {
			await client.query(
				`INSERT INTO ${tableName} (timestamp, open, high, low, close, base_vol, quote_vol)
					VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[bucketStarts[i], rate, rate, rate, rate, baseVol, quoteVol],
			)
		}
	}
}

// Credits to grok ai
const getBucketStart = (date: Date, bucketSize: string) => {
	let ms = 1000 * 60 // 1 minute in milliseconds
	switch (bucketSize) {
		case '5m':
			ms *= 5
			break
		case '30m':
			ms *= 30
			break
		case '1h':
			ms *= 60
			break
		case '4h':
			ms *= 60 * 4
			break
		case '1d': // 1 day
			return new Date(date.setUTCHours(0, 0, 0, 0)).toISOString()
		case '1w':
			// Assuming weeks start on Monday for simplicity
			return new Date(
				date.setUTCHours(0, 0, 0, 0) -
					(date.getUTCDay() - 1) * 24 * 60 * 60 * 1000,
			).toISOString()
		case '4w':
			// First day of the month at midnight
			return new Date(date.getUTCFullYear(), date.getUTCMonth(), 1)
				.toISOString()
		default:
			throw new Error('Unsupported bucket size')
	}
	return new Date(Math.floor(date.getTime() / ms) * ms).toISOString()
}

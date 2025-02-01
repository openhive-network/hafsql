import { Big } from '../../deps.ts'
import { balanceImpactingOps } from '../helpers/balance_impacting_ops.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { getUserId } from '../helpers/utils/get_user_id.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { opId } from '../helpers/operation_id.ts'
import {
	AllSymbols,
	Balances,
	BalancesFakeTable,
	BalancesOnly,
	CancelFromTransfer,
	FillFromTransfer,
	HardforkHive,
	ImpactedBalances,
	Interests,
	PendingSavings,
	Savings,
	TransferFromSavings,
	TransferToSavings,
} from '../helpers/types.ts'
import { createBalancesIndexes } from '../indexes/hafsql_indexes.ts'
import { customClient, query, transaction } from '../helpers/database.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[Balances] Start massive sync... ⏳')
			syncBalances()
		}
	}
}

let firstRun = true
const syncBalances = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillBalances()
		await createBalancesIndexes()
		print('[Balances] Massive sync done ✅')
		print('[Balances] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillBalances()
	await sleep(intervalTime)
	syncBalances()
}

/**
 * Fill the balances table with the account ids from hafd.accounts
 * And keep adding them on live sync
 */
const prepareTable = async () => {
	const lastAccountQ = await query<{ account: number }>(
		`SELECT account FROM hafsql.balances_table ORDER BY account DESC LIMIT 1`,
	)
	let lastAccount = -1
	if (lastAccountQ.rows.length > 0) {
		lastAccount = lastAccountQ.rows[0].account
	}
	const lastNewAccountQ = await query<{ id: number }>(
		`SELECT id FROM hafd.accounts ORDER BY id DESC LIMIT 1`,
	)
	const lastNewAccount = lastNewAccountQ.rows[0].id
	if (lastNewAccount > lastAccount) {
		await query(
			`INSERT INTO hafsql.balances_table (account) SELECT id FROM hafd.accounts WHERE id > $1`,
			[lastAccount],
		)
	}
}

let massiveSync = true
const fillBalances = async () => {
	let blockRange = await getBlockRange('balances')
	if (blockRange && blockRange[1] - blockRange[0] < 49999) {
		massiveSync = false
	}
	while (blockRange) {
		await prepareTable()
		await fillFakeTable()
		const data = await getData(blockRange)
		await processData(data, blockRange)
		blockRange = await getBlockRange('balances')
	}
}

const getData = async (blockRange: number[]) => {
	// https://gitlab.syncad.com/hive/balance_tracker/-/blob/develop/db/process_block_range.sql?ref_type=heads#L35
	// hive.get_impacted_balances()
	// hive.get_balance_impacting_operations()
	let queryStr = ''
	for (let i = 0; i < balanceImpactingOps.length; i++) {
		if (i !== 0) {
			queryStr += '\nUNION ALL'
		}
		// 3889921816588623 = hf1
		queryStr +=
			`\nSELECT (hive.get_impacted_balances(body_binary, id > 3889921816588623)).*, id,
        hafd.operation_id_to_type_id(id) AS op_type_id,
        hafd.operation_id_to_block_num(id) AS block_num FROM hafd.operations
        WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
        AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
        AND hafd.operation_id_to_type_id(id) = ${balanceImpactingOps[i]}`
		if (i === balanceImpactingOps.length - 1) {
			queryStr += '\nORDER BY id ASC'
		}
	}
	const result = await query<ImpactedBalances>(queryStr)
	const impactedBalances = result.rows
	// Savings
	const ottsQ = await query<TransferToSavings>(
		`SELECT id, from_account, to_account, amount, symbol, hafd.operation_id_to_block_num(id) AS block_num FROM hafsql.operation_transfer_to_savings_table otts
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const otfsQ = await query<TransferFromSavings>(
		`SELECT id, from_account, to_account, amount, symbol, request_id, hafd.operation_id_to_block_num(id) AS block_num FROM hafsql.operation_transfer_from_savings_table otfs 
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const octfsQ = await query<CancelFromTransfer>(
		`SELECT id, from_account, request_id, hafd.operation_id_to_block_num(id) AS block_num FROM hafsql.operation_cancel_transfer_from_savings_table octfs
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const vftfsQ = await query<FillFromTransfer>(
		`SELECT id, from_account, request_id, hafd.operation_id_to_block_num(id) AS block_num FROM hafsql.operation_fill_transfer_from_savings_table vftfs 
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const interestQ = await query<Interests>(
		`SELECT id, owner, interest, hafd.operation_id_to_block_num(id) AS block_num FROM hafsql.operation_interest_table
      WHERE is_saved_into_hbd_balance = false
      AND id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	// Sort saving rows by op_id and pack them in one array
	const savings: Savings[] = []
	for (let i = 0; i < ottsQ.rows.length; i++) {
		savings.push({ ...ottsQ.rows[i], type: 'transfer_to_savings' })
	}
	for (let i = 0; i < otfsQ.rows.length; i++) {
		savings.push({ ...otfsQ.rows[i], type: 'transfer_from_savings' })
	}
	for (let i = 0; i < octfsQ.rows.length; i++) {
		savings.push({ ...octfsQ.rows[i], type: 'cancel_transfer_from_savings' })
	}
	for (let i = 0; i < vftfsQ.rows.length; i++) {
		savings.push({ ...vftfsQ.rows[i], type: 'fill_transfer_from_savings' })
	}
	for (let i = 0; i < interestQ.rows.length; i++) {
		savings.push({ ...interestQ.rows[i], type: 'interest' })
	}
	savings.sort((a, b) => {
		if (a.id > b.id) {
			return 1
		} else if (a.id < b.id) {
			return -1
		} else {
			return 0
		}
	})
	return { impactedBalances, savings }
}

const processData = async (
	data: {
		impactedBalances: ImpactedBalances[]
		savings: Savings[]
	},
	blockRange: number[],
) => {
	await transaction(async (client) => {
		// await trx.queryObject('SET idle_in_transaction_session_timeout = 600000;')
		const { impactedBalances, savings } = data

		await handleNormalBalances(impactedBalances, client)
		await handleSavings(savings, client)

		// get_impacted_balances() doesn't set the accounts affected by hive fork to 0
		// so we have to set them manually here
		if (41818752 >= blockRange[0] && 41818752 <= blockRange[1]) {
			await clearHiveForkBalances(client)
		}
		if (massiveSync) {
			await processHistory(client)
			await processTotalBalances(client)
			await processFakeTable(client)
		}
		await updateLastBlockNum('balances', blockRange[1], client)
	})
	if (massiveSync) {
		// If the above transaction fails and rolls back we can't rollback faketables
		// so we have to do this after making sure the transaction is committed
		for (let i = 0; i < fakeTable.length; i++) {
			if (fakeTable[i].updated) {
				fakeTable[i].updated = false
			}
		}
	}
}

const handleNormalBalances = async (
	impactedBalances: ImpactedBalances[],
	client: customClient,
) => {
	for (let i = 0; i < impactedBalances.length; i++) {
		const { account_name, asset_symbol_nai, block_num, op_type_id } =
			impactedBalances[i]
		let amount = new Big(impactedBalances[i].amount)
		let symbol: AllSymbols = 'vests'
		switch (asset_symbol_nai) {
			case 13:
				symbol = 'hbd'
				amount = amount.div(1000)
				break
			case 21:
				symbol = 'hive'
				amount = amount.div(1000)
				break
			default:
				amount = amount.div(1000000)
		}
		if (account_name === 'null') {
			// get_impacted_balances doesn't return the negatives for null
			// so we skip null entirely
			continue
		}
		const accountId = <number> await getUserId(account_name, client)
		if (op_type_id === opId.consolidate_treasury_balance) {
			await consolidateTreasury(block_num, client)
		}
		if (symbol === 'hbd') { // hbd
			if (massiveSync) {
				fakeTable[accountId].hbd = fakeTable[accountId].hbd.add(amount)
				fakeTable[accountId].updated = true
			} else {
				await client.query(
					`UPDATE hafsql.balances_table SET hbd = hbd + $1 WHERE account = $2`,
					[amount.toString(), accountId],
				)
			}
		} else if (symbol === 'hive') { // hive
			if (massiveSync) {
				fakeTable[accountId].hive = fakeTable[accountId].hive.add(amount)
				fakeTable[accountId].updated = true
			} else {
				await client.query(
					`UPDATE hafsql.balances_table SET hive = hive + $1 WHERE account = $2`,
					[amount.toString(), accountId],
				)
			}
		} else if (symbol === 'vests') { // hp
			if (massiveSync) {
				fakeTable[accountId].vests = fakeTable[accountId].vests.add(amount)
				fakeTable[accountId].updated = true
			} else {
				await client.query(
					`UPDATE hafsql.balances_table SET vests = vests + $1 WHERE account = $2`,
					[amount.toString(), accountId],
				)
			}
		} else {
			console.log('Non-normal NAI', impactedBalances[i])
		}

		// if (impactsTotalBalances(op_type_id)) {
		//   await totalBalances(block_num, amount.toString(), symbol, trx)
		// }
		if (block_num % 28800 === 0) {
			await totalBalances(block_num, client)
		}
		await insertHistory(accountId, block_num, client)
	}
}

const handleSavings = async (savings: Savings[], client: customClient) => {
	for (let i = 0; i < savings.length; i++) {
		const item = savings[i]
		const { type, block_num } = item
		if (type === 'transfer_to_savings') {
			await handleTransferToSavings(item, client, block_num)
		} else if (type === 'transfer_from_savings') {
			await handleTransferFromSavings(item, client, block_num)
		} else if (type === 'cancel_transfer_from_savings') {
			await handleCancelTransferFromSavings(item, client, block_num)
		} else if (type === 'fill_transfer_from_savings') {
			await handleFillTransferFromSavings(item, client)
		} else if (type === 'interest') {
			await handleInterest(item, client, block_num)
		}
	}
}

// object[key]: key can be number but it will be converted into string in the object
// hence totalBalancesCache[block_num] is valid
let totalBalancesCache: Record<string, BalancesOnly> = {}
const totalBalances = async (
	block_num: number,
	client: customClient,
) => {
	if (!massiveSync) {
		await client.query<BalancesOnly>(
			`INSERT INTO hafsql.total_balances_table (block_num, hive, hbd, vests, hive_savings, hbd_savings)
        SELECT $1, SUM(hive) AS hive, SUM(hbd) AS hbd, SUM(vests) AS vests,
        SUM(hive_savings) AS hive_savings, SUM(hbd_savings) AS hbd_savings
        FROM hafsql.balances_table
        ON CONFLICT ON CONSTRAINT hafsql_total_balances_table_un DO NOTHING
        `,
			[block_num],
		)
	} else {
		const temp = {
			hive: new Big('0'),
			hbd: new Big('0'),
			vests: new Big('0'),
			hive_savings: new Big('0'),
			hbd_savings: new Big('0'),
		}
		for (let i = 0; i < fakeTable.length; i++) {
			const { hbd, hive, vests, hive_savings, hbd_savings } = fakeTable[i]
			temp.hbd = temp.hbd.add(hbd)
			temp.hive = temp.hive.add(hive)
			temp.vests = temp.vests.add(vests)
			temp.hive_savings = temp.hive_savings.add(hive_savings)
			temp.hbd_savings = temp.hbd_savings.add(hbd_savings)
		}
		totalBalancesCache[block_num] = temp
	}
}

// only during massive sync
const processTotalBalances = async (client: customClient) => {
	const keys = Object.keys(totalBalancesCache)
	const blocks = []
	const hives = []
	const hbds = []
	const vests = []
	const hive_savings = []
	const hbd_savings = []
	for (let i = 0; i < keys.length; i++) {
		const block_num = Number(keys[i])
		blocks.push(block_num)
		hives.push(totalBalancesCache[block_num].hive.toString())
		hbds.push(totalBalancesCache[block_num].hbd.toString())
		vests.push(totalBalancesCache[block_num].vests.toString())
		hive_savings.push(totalBalancesCache[block_num].hive_savings.toString())
		hbd_savings.push(totalBalancesCache[block_num].hbd_savings.toString())
	}
	await client
		.query`INSERT INTO hafsql.total_balances_table (block_num, hbd, hive, vests, hive_savings, hbd_savings)
       SELECT UNNEST(${blocks}::int4[]), UNNEST(${hbds}::numeric[]),
        UNNEST(${hives}::numeric[]), UNNEST(${vests}::numeric[]),
        UNNEST(${hive_savings}::numeric[]), UNNEST(${hbd_savings}::numeric[])
        ON CONFLICT ON CONSTRAINT hafsql_total_balances_table_un DO NOTHING
       `
	totalBalancesCache = {}
}

let historyCache: Record<
	string,
	BalancesOnly
> = {}
const insertHistory = async (
	account: number,
	block_num: number,
	client: customClient,
) => {
	const balance = await getBalance(account, client)
	if (!massiveSync) {
		await client.query(
			`INSERT INTO hafsql.balances_history_table (account, block_num, hbd, hive, vests, hive_savings, hbd_savings)
          VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ON CONSTRAINT hafsql_balances_history_table_un
          DO UPDATE SET hbd=$3, hive=$4, vests=$5, hive_savings=$6, hbd_savings=$7;`,
			[
				account,
				block_num,
				balance.hbd.toString(),
				balance.hive.toString(),
				balance.vests.toString(),
				balance.hive_savings.toString(),
				balance.hbd_savings.toString(),
			],
		)
		return
	}
	historyCache[account + ';' + block_num] = balance
}

// only during massive sync
const processHistory = async (client: customClient) => {
	const keys = Object.keys(historyCache)
	const accounts = []
	const blocks = []
	const hives = []
	const hbds = []
	const vests = []
	const hive_savings = []
	const hbd_savings = []
	for (let i = 0; i < keys.length; i++) {
		const arr = keys[i].split(';')
		accounts.push(arr[0])
		blocks.push(arr[1])
		hives.push(historyCache[keys[i]].hive.toString())
		hbds.push(historyCache[keys[i]].hbd.toString())
		vests.push(historyCache[keys[i]].vests.toString())
		hive_savings.push(historyCache[keys[i]].hive_savings.toString())
		hbd_savings.push(historyCache[keys[i]].hbd_savings.toString())
	}
	await client
		.query`INSERT INTO hafsql.balances_history_table (account, block_num, hbd, hive, vests, hive_savings, hbd_savings)
        SELECT UNNEST(${accounts}::int4[]), UNNEST(${blocks}::int4[]),
        UNNEST(${hbds}::numeric[]), UNNEST(${hives}::numeric[]),
        UNNEST(${vests}::numeric[]), UNNEST(${hive_savings}::numeric[]),
        UNNEST(${hbd_savings}::numeric[])
        ON CONFLICT ON CONSTRAINT hafsql_balances_history_table_un DO UPDATE SET
        hive=excluded.hive, hbd=excluded.hbd, vests=excluded.vests,
        hive_savings=excluded.hive_savings, hbd_savings=excluded.hbd_savings`
	historyCache = {}
}

const getBalance = async (account: number, client: customClient) => {
	if (!massiveSync) {
		const result = await client.query<BalancesOnly>(
			`SELECT hive, hbd, vests, hive_savings, hbd_savings FROM hafsql.balances_table
        WHERE account = $1`,
			[account],
		)
		return result.rows[0]
	}
	return fakeTable[account]
}

// only used during massiveSync
const processFakeTable = async (client: customClient) => {
	for (let i = 0; i < fakeTable.length; i++) {
		if (!fakeTable[i].updated) {
			continue
		}
		const account = i
		const { hbd, hive, vests, hive_savings, hbd_savings } = fakeTable[i]
		await client.query(
			`UPDATE hafsql.balances_table SET hive = $1, hbd = $2, vests = $3, hive_savings = $4, hbd_savings = $5
        WHERE account=$6`,
			[
				hive.toString(),
				hbd.toString(),
				vests.toString(),
				hive_savings.toString(),
				hbd_savings.toString(),
				account,
			],
		)
	}
}

// only used during massiveSync
// Using cache to speedup the sync - index is the account id
let fakeTable: BalancesFakeTable[] = []
const fillFakeTable = async () => {
	if (!massiveSync) {
		fakeTable = []
		return
	}
	const lastId = fakeTable.length - 1
	const result = await query<Balances>(
		`SELECT account, hive, hbd, vests, hive_savings, hbd_savings FROM hafsql.balances_table
      WHERE account > $1 ORDER BY account ASC`,
		[lastId],
	)
	result.rows.forEach((row) => {
		fakeTable[row.account] = {
			hive: new Big(row.hive),
			hbd: new Big(row.hbd),
			vests: new Big(row.vests),
			hive_savings: new Big(row.hive_savings),
			hbd_savings: new Big(row.hbd_savings),
			updated: false,
		}
	})
}

// hive.get_impacted_balances doesn't return the balances removed by Hive Fork at 41818752
const clearHiveForkBalances = async (client: customClient) => {
	const result = await client.query<HardforkHive>(
		`SELECT account FROM hafsql.operation_hardfork_hive_table`,
	)
	for (let i = 0; i < result.rows.length; i++) {
		const { account } = result.rows[i]
		const accountId = <number> await getUserId(account, client)
		const hfNum = 41818752
		if (massiveSync) {
			fakeTable[accountId].hive = new Big('0')
			fakeTable[accountId].hbd = new Big('0')
			fakeTable[accountId].vests = new Big('0')
			fakeTable[accountId].hive_savings = new Big('0')
			fakeTable[accountId].hbd_savings = new Big('0')
			fakeTable[accountId].updated = true
		} else {
			// realisticly this will never run because it is in past
			// TODO: probably can remove this
			await client.query(
				`UPDATE hafsql.balances_table SET hive=0, hbd=0, vests=0, hive_savings=0, hbd_savings=0
          WHERE account=$1;`,
				[accountId],
			)
		}
		await insertHistory(accountId, hfNum, client)
	}
}

// get_impacted_balances doesn't set the effect of balance on steem.dao for this vop
const consolidateTreasury = async (block_num: number, client: customClient) => {
	const accountId = <number> await getUserId('steem.dao', client)
	if (massiveSync) {
		fakeTable[accountId].hbd = new Big('0')
		fakeTable[accountId].hive = new Big('0')
		fakeTable[accountId].vests = new Big('0')
		fakeTable[accountId].hive_savings = new Big('0')
		fakeTable[accountId].hbd_savings = new Big('0')
		fakeTable[accountId].updated = true
	} else {
		await client.query(
			`UPDATE hafsql.balances_table SET hbd=$1, hive=$2, vests=$3, hive_savings=$4, hbd_savings=$5 WHERE account = $6`,
			['0', '0', '0', '0', '0', accountId],
		)
	}
	await insertHistory(accountId, block_num, client)
}

const handleTransferToSavings = async (
	item: Savings,
	client: customClient,
	block_num: number,
) => {
	// Add to the savings balance of the "to" account
	const to = <string> item.to_account
	const amount = <string> item.amount
	const symbol = <'hive' | 'hbd'> item.symbol?.toLowerCase()
	const toId = <number> await getUserId(to, client)
	if (massiveSync) {
		if (symbol === 'hive') {
			fakeTable[toId].hive_savings = fakeTable[toId].hive_savings.add(amount)
		} else {
			fakeTable[toId].hbd_savings = fakeTable[toId].hbd_savings.add(amount)
		}
		fakeTable[toId].updated = true
	} else {
		await client.query(
			`UPDATE hafsql.balances_table SET ${symbol}_savings = ${symbol}_savings + $1 WHERE account = $2`,
			[amount, toId],
		)
	}
	await insertHistory(toId, block_num, client)
}

const handleTransferFromSavings = async (
	item: Savings,
	client: customClient,
	block_num: number,
) => {
	// Deduct from the savings balance of the "from" account
	const from = <string> item.from_account
	const to = <string> item.to_account
	const amount = <string> item.amount
	const symbol = <'hive' | 'hbd'> item.symbol?.toLowerCase()
	const request_id = item.request_id
	const fromId = <number> await getUserId(from, client)
	const toId = <number> await getUserId(to, client)
	if (massiveSync) {
		if (symbol === 'hive') {
			fakeTable[fromId].hive_savings = fakeTable[fromId].hive_savings.minus(
				amount,
			)
		} else {
			fakeTable[fromId].hbd_savings = fakeTable[fromId].hbd_savings.minus(
				amount,
			)
		}
	} else {
		await client.query(
			`UPDATE hafsql.balances_table SET ${symbol}_savings = ${symbol}_savings - $1 WHERE account = $2`,
			[amount, fromId],
		)
	}
	// insert pending savings - shouldn't be that many rows to make things too slow
	// if slow, have to bulk insert
	// TODO: Remove the on conflict later
	await client.query(
		`INSERT INTO hafsql.pending_saving_withdraws_table ("from", "to", request_id, amount, symbol) VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT ON CONSTRAINT hafsql_pending_saving_withdraws_table_un DO NOTHING`,
		[fromId, toId, request_id, amount, symbol],
	)
	await insertHistory(fromId, block_num, client)
}

const handleCancelTransferFromSavings = async (
	item: Savings,
	client: customClient,
	block_num: number,
) => {
	// Add back to the savings balance of the "from" account
	const from = <string> item.from_account
	const request_id = item.request_id
	const fromId = <number> await getUserId(from, client)
	const pendingQ = await client.query<PendingSavings>(
		`SELECT amount, symbol FROM hafsql.pending_saving_withdraws_table WHERE "from"=$1 AND request_id=$2`,
		[fromId, request_id],
	)
	if (pendingQ.rows.length < 1) {
		return
	}
	const { amount, symbol } = pendingQ.rows[0]
	if (massiveSync) {
		if (symbol === 'hive') {
			fakeTable[fromId].hive_savings = fakeTable[fromId].hive_savings.add(
				amount,
			)
		} else {
			fakeTable[fromId].hbd_savings = fakeTable[fromId].hbd_savings.add(amount)
		}
	} else {
		await client.query(
			`UPDATE hafsql.balances_table SET ${symbol}_savings = ${symbol}_savings + $1 WHERE account = $2`,
			[amount, fromId],
		)
	}
	await client.query(
		`DELETE FROM hafsql.pending_saving_withdraws_table WHERE "from"=$1 AND request_id=$2`,
		[fromId, request_id],
	)
	await insertHistory(fromId, block_num, client)
}

const handleFillTransferFromSavings = async (
	item: Savings,
	client: customClient,
) => {
	// Remove the entry from the pendings table
	const from = <string> item.from_account
	const request_id = item.request_id
	const fromId = await getUserId(from, client)
	await client.query(
		`DELETE FROM hafsql.pending_saving_withdraws_table WHERE "from"=$1 AND request_id=$2`,
		[fromId, request_id],
	)
}

const handleInterest = async (
	item: Savings,
	client: customClient,
	block_num: number,
) => {
	// Add interest into the hbd_savings balance of the "owner" account
	// Includes only the interest added to the hbd_savings balance
	const owner = <string> item.owner
	const interest = <string> item.interest
	const ownerId = <number> await getUserId(owner, client)
	if (massiveSync) {
		fakeTable[ownerId].hbd_savings = fakeTable[ownerId].hbd_savings.add(
			interest,
		)
	} else {
		await client.query(
			`UPDATE hafsql.balances_table SET hbd_savings = hbd_savings + $1 WHERE account = $2`,
			[interest.toString(), ownerId],
		)
	}
	await insertHistory(ownerId, block_num, client)
}

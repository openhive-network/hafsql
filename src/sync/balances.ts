import { BigDenary, Transaction } from '../deps.ts'
import { balanceImpactingOps } from '../helpers/balance_impacting_ops.ts'
import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getUserId } from '../helpers/functions/get_user_id.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
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
import { createBalancesIndexes } from '../indexes/hafsql.ts'

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
 * Fill the balances table with the account ids from hive.accounts
 * And keep adding them on live sync
 */
const prepareTable = async () => {
  using client = await pool.connect()
  const lastAccountQ = await client.queryObject<{ account: number }>(
    `SELECT account FROM hafsql.balances_table ORDER BY account DESC LIMIT 1`,
  )
  let lastAccount = -1
  if (lastAccountQ.rows.length > 0) {
    lastAccount = lastAccountQ.rows[0].account
  }
  const lastNewAccountQ = await client.queryObject<{ id: number }>(
    `SELECT id FROM hive.accounts ORDER BY id DESC LIMIT 1`,
  )
  const lastNewAccount = lastNewAccountQ.rows[0].id
  if (lastNewAccount > lastAccount) {
    await client.queryObject(
      `INSERT INTO hafsql.balances_table (account) SELECT id FROM hive.accounts WHERE id > $1`,
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
  let query = ''
  for (let i = 0; i < balanceImpactingOps.length; i++) {
    if (i !== 0) {
      query += '\nUNION ALL'
    }
    // 3889921816588623 = hf1
    query +=
      `\nSELECT (hive.get_impacted_balances(body_binary, id > 3889921816588623)).*, id,
        hive.operation_id_to_type_id(id) AS op_type_id,
        hive.operation_id_to_block_num(id) AS block_num FROM hive.operations
        WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
        AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
        AND hive.operation_id_to_type_id(id) = ${balanceImpactingOps[i]}`
    if (i === balanceImpactingOps.length - 1) {
      query += '\nORDER BY id ASC'
    }
  }
  using client = await pool.connect()
  const result = await client.queryObject<ImpactedBalances>(query)
  const impactedBalances = result.rows
  // Savings
  const ottsQ = await client.queryObject<TransferToSavings>(
    `SELECT op_id, "from", "to", amount, symbol, block_num FROM hafsql.op_transfer_to_savings otts
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const otfsQ = await client.queryObject<TransferFromSavings>(
    `SELECT op_id, "from", "to", amount, symbol, request_id, block_num FROM hafsql.op_transfer_from_savings otfs 
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const octfsQ = await client.queryObject<CancelFromTransfer>(
    `SELECT op_id, "from", request_id, block_num FROM hafsql.op_cancel_transfer_from_savings octfs
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const vftfsQ = await client.queryObject<FillFromTransfer>(
    `SELECT op_id, "from", request_id, block_num FROM hafsql.vo_fill_transfer_from_savings vftfs 
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const interestQ = await client.queryObject<Interests>(
    `SELECT op_id, "owner", interest, block_num FROM hafsql.vo_interest
      WHERE is_saved_into_hbd_balance = false
      AND op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
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
    if (a.op_id > b.op_id) {
      return 1
    } else if (a.op_id < b.op_id) {
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
  const client = await pool.connect()
  const trx = client.createTransaction('hafsql_balances_sync')
  await trx.begin()
  // await trx.queryObject('SET idle_in_transaction_session_timeout = 600000;')
  const { impactedBalances, savings } = data

  await handleNormalBalances(impactedBalances, trx)
  await handleSavings(savings, trx)

  // get_impacted_balances() doesn't set the accounts affected by hive fork to 0
  // so we have to set them manually here
  if (41818752 >= blockRange[0] && 41818752 <= blockRange[1]) {
    await clearHiveForkBalances(trx)
  }
  if (massiveSync) {
    await processHistory(trx)
    await processTotalBalances(trx)
    await processFakeTable(trx)
  }
  await updateLastBlockNum('balances', blockRange[1], trx)
  await trx.commit()
  client.release()

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
  trx: Transaction,
) => {
  for (let i = 0; i < impactedBalances.length; i++) {
    const { account_name, asset_symbol_nai, block_num, op_type_id } =
      impactedBalances[i]
    if (account_name === 'null') {
      // get_impacted_balances doesn't return the negatives for null
      // so we skip null entirely
      continue
    }
    let amount = new BigDenary(impactedBalances[i].amount)
    const accountId = <number> await getUserId(account_name, trx)
    if (op_type_id === opId.consolidate_treasury_balance) {
      await consolidateTreasury(block_num, trx)
    }
    if (asset_symbol_nai === 13) { // hbd
      amount = amount.div(1000)
      if (massiveSync) {
        fakeTable[accountId].hbd = new BigDenary(fakeTable[accountId].hbd).add(
          amount,
        ).toString()
        fakeTable[accountId].updated = true
      } else {
        await trx.queryObject(
          `UPDATE hafsql.balances_table SET hbd = hbd + $1 WHERE account = $2`,
          [amount.toString(), accountId],
        )
      }
    } else if (asset_symbol_nai === 21) { // hive
      amount = amount.div(1000)
      if (massiveSync) {
        fakeTable[accountId].hive = new BigDenary(fakeTable[accountId].hive)
          .add(amount).toString()
        fakeTable[accountId].updated = true
      } else {
        await trx.queryObject(
          `UPDATE hafsql.balances_table SET hive = hive + $1 WHERE account = $2`,
          [amount.toString(), accountId],
        )
      }
    } else if (asset_symbol_nai === 37) { // hp
      amount = amount.div(1000000)
      if (massiveSync) {
        fakeTable[accountId].vests = new BigDenary(fakeTable[accountId].vests)
          .add(amount).toString()
        fakeTable[accountId].updated = true
      } else {
        await trx.queryObject(
          `UPDATE hafsql.balances_table SET vests = vests + $1 WHERE account = $2`,
          [amount.toString(), accountId],
        )
      }
    } else {
      console.log('Non-normal NAI', impactedBalances[i])
    }
    let symbol: AllSymbols = 'vests'
    switch (asset_symbol_nai) {
      case 13:
        symbol = 'hbd'
        break
      case 21:
        symbol = 'hive'
        break
    }
    // if (impactsTotalBalances(op_type_id)) {
    await totalBalances(block_num, amount.toString(), symbol, trx)
    // }
    await insertHistory(accountId, block_num, trx)
  }
}

const impactsTotalBalances = (op_type_id: number) => {
  switch (op_type_id) {
    case opId.author_reward:
    case opId.claim_account:
    case opId.account_create:
    case opId.account_create_with_delegation:
    case opId.claim_reward_balance:
    case opId.curation_reward:
    case opId.dhf_conversion:
    case opId.dhf_funding:
    case opId.collateralized_convert:
    case opId.fill_collateralized_convert_request:
    case opId.collateralized_convert_immediate_conversion:
    case opId.convert:
    case opId.fill_convert_request:
    case opId.fill_transfer_from_savings:
    case opId.transfer_to_savings:
    case opId.fill_vesting_withdraw:
    case opId.interest:
    case opId.liquidity_reward:
    case opId.pow_reward:
    case opId.producer_reward:
    case opId.proposal_fee:
    case opId.transfer_to_vesting_completed:
      return true
    default:
      return false
  }
}

const handleSavings = async (savings: Savings[], trx: Transaction) => {
  for (let i = 0; i < savings.length; i++) {
    const item = savings[i]
    const { type, block_num } = item
    if (type === 'transfer_to_savings') {
      await handleTransferToSavings(item, trx, block_num)
    } else if (type === 'transfer_from_savings') {
      await handleTransferFromSavings(item, trx, block_num)
    } else if (type === 'cancel_transfer_from_savings') {
      await handleCancelTransferFromSavings(item, trx, block_num)
    } else if (type === 'fill_transfer_from_savings') {
      await handleFillTransferFromSavings(item, trx)
    } else if (type === 'interest') {
      await handleInterest(item, trx, block_num)
    }
  }
}

// object[key]: key can be number but it will be converted into string in the object
// hence totalBalancesCache[block_num] is valid
const totalBalancesCache: Record<string, BalancesOnly> = {}
let lastKey = ''
const totalBalances = async (
  block_num: number,
  amount: string,
  symbol: AllSymbols,
  trx: Transaction,
) => {
  if (!massiveSync) {
    const result = await trx.queryObject<BalancesOnly>(
      `SELECT hive, hbd, vests, hive_savings, hbd_savings FROM hafsql.total_balances_table
        WHERE block_num <= $1 ORDER BY block_num DESC LIMIT 1`,
      [block_num],
    )
    let hive = '0'
    let hbd = '0'
    let vests = '0'
    let hive_savings = '0'
    let hbd_savings = '0'
    if (result.rows.length > 0) {
      hive = result.rows[0].hive
      hbd = result.rows[0].hbd
      vests = result.rows[0].vests
      hive_savings = result.rows[0].hive_savings
      hbd_savings = result.rows[0].hbd_savings
    }
    if (symbol === 'hive') {
      hive = new BigDenary(hive).add(amount).toString()
    } else if (symbol === 'hbd') {
      hbd = new BigDenary(hbd).add(amount).toString()
    } else if (symbol === 'vests') {
      vests = new BigDenary(vests).add(amount).toString()
    } else if (symbol === 'hive_savings') {
      hive_savings = new BigDenary(hive_savings).add(amount).toString()
    } else if (symbol === 'hbd_savings') {
      hbd_savings = new BigDenary(hbd_savings).add(amount).toString()
    }
    await trx.queryObject(
      `INSERT INTO hafsql.total_balances_table (block_num, hive, hbd, vests, hive_savings, hbd_savings)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ON CONSTRAINT hafsql_total_balances_table_un DO UPDATE SET
        hive=$2, hbd=$3, vests=$4, hive_savings=$5, hbd_savings=$6`,
      [block_num, hive, hbd, vests, hive_savings, hbd_savings],
    )
  } else {
    if (lastKey === '') {
      const result = await trx.queryObject<BalancesOnly>(
        `SELECT hive, hbd, vests, hive_savings, hbd_savings FROM hafsql.total_balances_table
          WHERE block_num <= $1 ORDER BY block_num DESC LIMIT 1`,
        [block_num],
      )
      let hive = '0'
      let hbd = '0'
      let vests = '0'
      let hive_savings = '0'
      let hbd_savings = '0'
      if (result.rows.length > 0) {
        hive = result.rows[0].hive
        hbd = result.rows[0].hbd
        vests = result.rows[0].vests
        hive_savings = result.rows[0].hive_savings
        hbd_savings = result.rows[0].hbd_savings
      }
      totalBalancesCache[block_num] = {
        hive,
        hbd,
        vests,
        hive_savings,
        hbd_savings,
      }
      lastKey = block_num.toString()
    }
    const temp = { ...totalBalancesCache[lastKey] }
    temp[symbol] = new BigDenary(temp[symbol]).add(amount).toString()
    if (Object.hasOwn(totalBalancesCache, block_num)) {
      totalBalancesCache[block_num][symbol] = temp[symbol]
    } else {
      totalBalancesCache[block_num] = temp
    }
    lastKey = block_num.toString()
  }
}

// only during massive sync
const processTotalBalances = async (trx: Transaction) => {
  let keys = Object.keys(totalBalancesCache)
  // 65000 / 6 = 10800 max rows for bulk insert
  const MAX_ROWS = 10800
  while (keys.length > 0) {
    const maxLen = Math.min(keys.length, MAX_ROWS)
    let query =
      'INSERT INTO hafsql.total_balances_table (block_num, hbd, hive, vests, hive_savings, hbd_savings) VALUES'
    for (let i = 0; i < maxLen; i++) {
      const block_num = Number(keys[i])
      const { hbd, hive, vests, hive_savings, hbd_savings } =
        totalBalancesCache[block_num]
      query += `(${block_num}, `
      query += `${hbd}, ${hive}, ${vests}, ${hive_savings}, ${hbd_savings})`
      if (i !== maxLen - 1) {
        query += ','
      }
      delete totalBalancesCache[keys[i]]
    }
    query +=
      ` ON CONFLICT ON CONSTRAINT hafsql_total_balances_table_un DO UPDATE SET
        hive=excluded.hive, hbd=excluded.hbd, vests=excluded.vests,
        hive_savings=excluded.hive_savings, hbd_savings=excluded.hbd_savings`
    await trx.queryObject(query)
    keys = Object.keys(totalBalancesCache)
  }
  lastKey = ''
}

const historyCache: Record<
  string,
  BalancesOnly
> = {}
const insertHistory = async (
  account: number,
  block_num: number,
  trx: Transaction,
) => {
  const balance = await getBalance(account, trx)
  if (!massiveSync) {
    await trx.queryObject(
      `INSERT INTO hafsql.balances_history_table (account, block_num, hbd, hive, vests, hive_savings, hbd_savings)
          VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ON CONSTRAINT hafsql_balances_history_table_un
          DO UPDATE SET hbd=$3, hive=$4, vests=$5, hive_savings=$6, hbd_savings=$7;`,
      [
        account,
        block_num,
        balance.hbd,
        balance.hive,
        balance.vests,
        balance.hive_savings,
        balance.hbd_savings,
      ],
    )
    return
  }
  historyCache[account + ';' + block_num] = balance
}

// only during massive sync
const processHistory = async (trx: Transaction) => {
  let keys = Object.keys(historyCache)
  // 65000 / 7 = 9000 max rows for bulk insert
  const MAX_ROWS = 9000
  while (keys.length > 0) {
    const maxLen = Math.min(keys.length, MAX_ROWS)
    let query =
      'INSERT INTO hafsql.balances_history_table (account, block_num, hbd, hive, vests, hive_savings, hbd_savings) VALUES'
    for (let i = 0; i < maxLen; i++) {
      const arr = keys[i].split(';')
      const { hbd, hive, vests, hive_savings, hbd_savings } =
        historyCache[keys[i]]
      query += `(${Number(arr[0])}, `
      query += `${Number(arr[1])}, `
      query += `${hbd}, ${hive}, ${vests}, ${hive_savings}, ${hbd_savings})`
      if (i !== maxLen - 1) {
        query += ','
      }
      delete historyCache[keys[i]]
    }
    query +=
      ` ON CONFLICT ON CONSTRAINT hafsql_balances_history_table_un DO UPDATE SET
        hive=excluded.hive, hbd=excluded.hbd, vests=excluded.vests,
        hive_savings=excluded.hive_savings, hbd_savings=excluded.hbd_savings`
    await trx.queryObject(query)
    keys = Object.keys(historyCache)
  }
}

const getBalance = async (account: number, trx: Transaction) => {
  if (!massiveSync) {
    const result = await trx.queryObject<BalancesOnly>(
      `SELECT hive, hbd, vests, hive_savings, hbd_savings FROM hafsql.balances_table
        WHERE account = $1`,
      [account],
    )
    return result.rows[0]
  }
  return fakeTable[account]
}

// only used during massiveSync
const processFakeTable = async (trx: Transaction) => {
  for (let i = 0; i < fakeTable.length; i++) {
    if (!fakeTable[i].updated) {
      continue
    }
    const account = i
    const { hbd, hive, vests, hive_savings, hbd_savings } = fakeTable[i]
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET hive = $1, hbd = $2, vests = $3, hive_savings = $4, hbd_savings = $5
        WHERE account=$6`,
      [hive, hbd, vests, hive_savings, hbd_savings, account],
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
  using client = await pool.connect()
  const lastId = fakeTable.length - 1
  const result = await client.queryObject<Balances>(
    `SELECT account, hive, hbd, vests, hive_savings, hbd_savings FROM hafsql.balances_table
      WHERE account > $1 ORDER BY account ASC`,
    [lastId],
  )
  result.rows.forEach((row) => {
    fakeTable[row.account] = {
      hive: row.hive,
      hbd: row.hbd,
      vests: row.vests,
      hive_savings: row.hive_savings,
      hbd_savings: row.hbd_savings,
      updated: false,
    }
  })
}

// hive.get_impacted_balances doesn't return the balances removed by Hive Fork at 41818752
const clearHiveForkBalances = async (trx: Transaction) => {
  const result = await trx.queryObject<HardforkHive>(
    `SELECT account, hbd_transferred, hive_transferred, vests_converted FROM hafsql.vo_hardfork_hive`,
  )
  for (let i = 0; i < result.rows.length; i++) {
    const { account } = result.rows[i]
    const accountId = <number> await getUserId(account, trx)
    const balances = await getBalance(accountId, trx)
    const hfNum = 41818752
    // await totalBalances(hfNum, '-' + balances.hbd, 'hbd', trx)
    // await totalBalances(hfNum, '-' + balances.hive, 'hive', trx)
    // await totalBalances(hfNum, '-' + balances.vests, 'vests', trx)
    await totalBalances(hfNum, '-' + balances.hbd_savings, 'hbd_savings', trx)
    await totalBalances(hfNum, '-' + balances.hive_savings, 'hive_savings', trx)
    if (massiveSync) {
      fakeTable[accountId].hive = '0'
      fakeTable[accountId].hbd = '0'
      fakeTable[accountId].vests = '0'
      fakeTable[accountId].hive_savings = '0'
      fakeTable[accountId].hbd_savings = '0'
      fakeTable[accountId].updated = true
    } else {
      // realisticly this will never run because it is in past
      // TODO: probably can remove this
      await trx.queryObject(
        `UPDATE hafsql.balances_table SET hive=0, hbd=0, vests=0, hive_savings=0, hbd_savings=0
          WHERE account=$1;`,
        [accountId],
      )
    }
    await insertHistory(accountId, hfNum, trx)
  }
}

// get_impacted_balances doesn't set the effect of balance on steem.dao for this vop
const consolidateTreasury = async (block_num: number, trx: Transaction) => {
  const accountId = <number> await getUserId('steem.dao', trx)
  if (massiveSync) {
    fakeTable[accountId].hbd = '0'
    fakeTable[accountId].hive = '0'
    fakeTable[accountId].vests = '0'
    fakeTable[accountId].hive_savings = '0'
    fakeTable[accountId].hbd_savings = '0'
    fakeTable[accountId].updated = true
  } else {
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET hbd=$1, hive=$2, vests=$3, hive_savings=$4, hbd_savings=$5 WHERE account = $6`,
      ['0', '0', '0', '0', '0', accountId],
    )
  }
  await insertHistory(accountId, block_num, trx)
}

const handleTransferToSavings = async (
  item: Savings,
  trx: Transaction,
  block_num: number,
) => {
  // Add to the savings balance of the "to" account
  const to = <string> item.to
  const amount = <string> item.amount
  const symbol = <'hive' | 'hbd'> item.symbol?.toLowerCase()
  const toId = <number> await getUserId(to, trx)
  if (massiveSync) {
    if (symbol === 'hive') {
      fakeTable[toId].hive_savings = new BigDenary(
        fakeTable[toId].hive_savings,
      ).add(amount).toString()
    } else {
      fakeTable[toId].hbd_savings = new BigDenary(
        fakeTable[toId].hbd_savings,
      ).add(amount).toString()
    }
    fakeTable[toId].updated = true
  } else {
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET ${symbol}_savings = ${symbol}_savings + $1 WHERE account = $2`,
      [amount, toId],
    )
  }
  await totalBalances(block_num, amount, `${symbol}_savings`, trx)
  await insertHistory(toId, block_num, trx)
}

const handleTransferFromSavings = async (
  item: Savings,
  trx: Transaction,
  block_num: number,
) => {
  // Deduct from the savings balance of the "from" account
  const from = <string> item.from
  const to = <string> item.to
  const amount = <string> item.amount
  const symbol = <'hive' | 'hbd'> item.symbol?.toLowerCase()
  const request_id = item.request_id
  const fromId = <number> await getUserId(from, trx)
  const toId = <number> await getUserId(to, trx)
  if (massiveSync) {
    if (symbol === 'hive') {
      fakeTable[fromId].hive_savings = new BigDenary(
        fakeTable[fromId].hive_savings,
      ).minus(amount).toString()
    } else {
      fakeTable[fromId].hbd_savings = new BigDenary(
        fakeTable[fromId].hbd_savings,
      ).minus(amount).toString()
    }
  } else {
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET ${symbol}_savings = ${symbol}_savings - $1 WHERE account = $2`,
      [amount, fromId],
    )
  }
  // insert pending savings - shouldn't be that many rows to make things too slow
  // if slow, have to bulk insert
  await trx.queryObject(
    `INSERT INTO hafsql.pending_saving_withdraws_table ("from", "to", request_id, amount, symbol) VALUES ($1, $2, $3, $4, $5)`,
    [fromId, toId, request_id, amount, symbol],
  )
  await totalBalances(block_num, '-' + amount, `${symbol}_savings`, trx)
  await insertHistory(fromId, block_num, trx)
}

const handleCancelTransferFromSavings = async (
  item: Savings,
  trx: Transaction,
  block_num: number,
) => {
  // Add back to the savings balance of the "from" account
  const from = <string> item.from
  const request_id = item.request_id
  const fromId = <number> await getUserId(from, trx)
  const pendingQ = await trx.queryObject<PendingSavings>(
    `SELECT amount, symbol FROM hafsql.pending_saving_withdraws_table WHERE "from"=$1 AND request_id=$2`,
    [fromId, request_id],
  )
  if (pendingQ.rows.length < 1) {
    return
  }
  const { amount, symbol } = pendingQ.rows[0]
  if (massiveSync) {
    if (symbol === 'hive') {
      fakeTable[fromId].hive_savings = new BigDenary(
        fakeTable[fromId].hive_savings,
      ).add(amount).toString()
    } else {
      fakeTable[fromId].hbd_savings = new BigDenary(
        fakeTable[fromId].hbd_savings,
      ).add(amount).toString()
    }
  } else {
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET ${symbol}_savings = ${symbol}_savings + $1 WHERE account = $2`,
      [amount, fromId],
    )
  }
  await trx.queryObject(
    `DELETE FROM hafsql.pending_saving_withdraws_table WHERE "from"=$1 AND request_id=$2`,
    [fromId, request_id],
  )
  await totalBalances(block_num, '-' + amount, `${symbol}_savings`, trx)
  await insertHistory(fromId, block_num, trx)
}

const handleFillTransferFromSavings = async (
  item: Savings,
  trx: Transaction,
) => {
  // Remove the entry from the pendings table
  const from = <string> item.from
  const request_id = item.request_id
  const fromId = await getUserId(from, trx)
  await trx.queryObject(
    `DELETE FROM hafsql.pending_saving_withdraws_table WHERE "from"=$1 AND request_id=$2`,
    [fromId, request_id],
  )
}

const handleInterest = async (
  item: Savings,
  trx: Transaction,
  block_num: number,
) => {
  // Add interest into the hbd_savings balance of the "owner" account
  // Includes only the interest added to the hbd_savings balance
  const owner = <string> item.owner
  const interest = <string> item.interest
  const ownerId = <number> await getUserId(owner, trx)
  if (massiveSync) {
    fakeTable[ownerId].hbd_savings = new BigDenary(
      fakeTable[ownerId].hbd_savings,
    ).add(interest).toString()
  } else {
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET hbd_savings = hbd_savings + $1 WHERE account = $2`,
      [interest.toString(), ownerId],
    )
  }
  await totalBalances(block_num, interest, `hbd_savings`, trx)
  await insertHistory(ownerId, block_num, trx)
}

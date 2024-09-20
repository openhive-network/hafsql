import { BigDenary, Transaction } from '../deps.ts'
import { balanceImpactingOps } from '../helpers/balance_impacting_ops.ts'
import { pool } from '../helpers/database.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getUserId } from '../helpers/functions/get_user_id.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import { opId } from '../helpers/operation_id.ts'
import { Balances, HardforkHive, ImpactedBalances } from '../helpers/types.ts'
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
    const impactedBalances = await getImpactedBalances(blockRange)
    await processImpactedBalances(impactedBalances, blockRange)
    await processFakeTable(blockRange)
    blockRange = await getBlockRange('balances')
  }
}

const getImpactedBalances = async (blockRange: number[]) => {
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
  return result.rows
  // https://gitlab.syncad.com/hive/balance_tracker/-/blob/develop/db/process_block_range.sql?ref_type=heads#L35
  // hive.get_impacted_balances()
  // hive.get_balance_impacting_operations()
}

const processImpactedBalances = async (
  impactedBalances: ImpactedBalances[],
  blockRange: number[],
) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_balances_sync')
  await trx.begin()
  for (let i = 0; i < impactedBalances.length; i++) {
    const { account_name, asset_symbol_nai, block_num, op_type_id } =
      impactedBalances[i]
    if (account_name === 'null') {
      // get_impacted_balances doesn't return the negatives for null
      // so we skip null entirely
      continue
    }
    let amount = new BigDenary(impactedBalances[i].amount)
    const accountId = <number> await getUserId(account_name)
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
    await insertHistory(accountId, block_num, trx)
  }
  // get_impacted_balances() doesn't set the accounts affected by hive fork to 0
  // so we have to set them manually here
  if (41818752 >= blockRange[0] && 41818752 <= blockRange[1]) {
    await clearHiveForkBalances(trx)
  }
  if (massiveSync) {
    await processHistory(trx)
  }
  if (!massiveSync) {
    // this is done in processFakeTables during massive sync
    await updateLastBlockNum('balances', blockRange[1], trx)
  }
  await trx.commit()
}

const historyCache: Record<
  string,
  { hive: string; hbd: string; vests: string }
> = {}
const insertHistory = async (
  account: number,
  block_num: number,
  trx: Transaction,
) => {
  const balance = await getBalance(account, trx)
  if (!massiveSync) {
    await trx.queryObject(
      `INSERT INTO hafsql.balances_history_table (account, block_num, hbd, hive, vests)
          VALUES ($1, $2, $3, $4, $5) ON CONFLICT ON CONSTRAINT hafsql_balances_history_table_un
          DO UPDATE SET hbd=$3, hive=$4, vests=$5;`,
      [
        account,
        block_num,
        balance.hbd,
        balance.hive,
        balance.vests,
      ],
    )
    return
  }
  historyCache[account + ';' + block_num] = balance
}

// only during massive sync
const processHistory = async (trx: Transaction) => {
  let keys = Object.keys(historyCache)
  // 65000 / 5 = 13000 max rows for bulk insert
  while (keys.length > 0) {
    const maxLen = Math.min(keys.length, 13000)
    let query =
      'INSERT INTO hafsql.balances_history_table (account, block_num, hbd, hive, vests) VALUES'
    for (let i = 0; i < maxLen; i++) {
      const arr = keys[i].split(';')
      const { hbd, hive, vests } = historyCache[keys[i]]
      query += `(${Number(arr[0])}, `
      query += `${Number(arr[1])}, `
      query += `${hbd}, ${hive}, ${vests})`
      if (i !== maxLen - 1) {
        query += ','
      }
      delete historyCache[keys[i]]
    }
    await trx.queryObject(query)
    keys = Object.keys(historyCache)
  }
}

const getBalance = async (account: number, trx: Transaction) => {
  if (!massiveSync) {
    const result = await trx.queryObject<
      { hive: string; hbd: string; vests: string }
    >(
      `SELECT hive, hbd, vests FROM hafsql.balances_table WHERE account = $1`,
      [account],
    )
    return result.rows[0]
  }
  return fakeTable[account]
}

// only used during massiveSync
const processFakeTable = async (blockRange: number[]) => {
  if (!massiveSync) {
    return
  }
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_balances_sync')
  await trx.begin()
  for (let i = 0; i < fakeTable.length; i++) {
    if (!fakeTable[i].updated) {
      continue
    }
    const account = i
    const { hbd, hive, vests } = fakeTable[i]
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET hive = $1, hbd = $2, vests = $3
        WHERE account=$4`,
      [hive, hbd, vests, account],
    )
  }
  await updateLastBlockNum('balances', blockRange[1], trx)
  await trx.commit()

  // If the above transaction fails and rolls back we can't rollback faketables
  // so we have to do this after making sure the transaction is committed
  for (let i = 0; i < fakeTable.length; i++) {
    if (fakeTable[i].updated) {
      fakeTable[i].updated = false
    }
  }
}

// only used during massiveSync
// Using cache to speedup the sync - index is the account id
let fakeTable: {
  hive: string
  hbd: string
  vests: string
  updated: boolean
}[] = []
const fillFakeTable = async () => {
  if (!massiveSync) {
    fakeTable = []
    return
  }
  using client = await pool.connect()
  const lastId = fakeTable.length - 1
  const result = await client.queryObject<Balances>(
    `SELECT account, hive, hbd, vests FROM hafsql.balances_table WHERE account > $1 ORDER BY account ASC`,
    [lastId],
  )
  result.rows.forEach((row) => {
    fakeTable[row.account] = {
      hive: row.hive,
      hbd: row.hbd,
      vests: row.vests,
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
    const accountId = <number> await getUserId(account)
    const hfNum = 41818752
    if (massiveSync) {
      fakeTable[accountId].hive = '0'
      fakeTable[accountId].hbd = '0'
      fakeTable[accountId].vests = '0'
      fakeTable[accountId].updated = true
    } else {
      // realisticly this will never run because it is in past
      // TODO: probably can remove this
      await trx.queryObject(
        `UPDATE hafsql.balances_table SET hive=0, hbd=0, vests=0 WHERE account=$1;`,
        [accountId],
      )
    }
    await insertHistory(accountId, hfNum, trx)
  }
}

// get_impacted_balances doesn't set the effect of balance on steem.dao for this vop
const consolidateTreasury = async (block_num: number, trx: Transaction) => {
  const accountId = <number> await getUserId('steem.dao')
  if (massiveSync) {
    fakeTable[accountId].hbd = '0'
    fakeTable[accountId].hive = '0'
    fakeTable[accountId].vests = '0'
    fakeTable[accountId].updated = true
  } else {
    await trx.queryObject(
      `UPDATE hafsql.balances_table SET hbd=$1, hive=$2, vests=$3 WHERE account = $4`,
      ['0', '0', '0', accountId],
    )
  }
  await insertHistory(accountId, block_num, trx)
}

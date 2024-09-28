// hafsql.op_setwithdraw_vesting_route

import { pool } from '../helpers/database.ts'
import { cleanJson } from '../helpers/functions/clean_json.ts'
import { getBlockRange } from '../helpers/functions/get_block_range.ts'
import { getUserId } from '../helpers/functions/get_user_id.ts'
import { print } from '../helpers/functions/print.ts'
import { sleep } from '../helpers/functions/sleep.ts'
import { updateLastBlockNum } from '../helpers/functions/update_last_block_num.ts'
import {
  AccountCreate,
  AccountCreated,
  AccountsData,
  AccountUpdate,
  AccountUpdate2,
  ChangedRecovery,
  Pow,
  RecoverAccount,
  WithdrawRoute,
  WitnessProxy,
} from '../helpers/types.ts'
import { createAccountsIndexes } from '../indexes/hafsql.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
  if (e.data === 'start') {
    if (!started) {
      started = true
      print('[Accounts] Start massive sync... ⏳')
      syncAccounts()
    }
  }
}

let firstRun = true
const syncAccounts = async () => {
  const intervalTime = 250
  if (firstRun) {
    firstRun = false
    await fillAccounts()
    await createAccountsIndexes()
    print('[Accounts] Massive sync done ✅')
    print('[Accounts] Switched to live sync 🟢')
    await sleep(intervalTime)
  }
  await fillAccounts()
  await sleep(intervalTime)
  syncAccounts()
}

/**
 * Fill the accounts table with the account ids from hive.accounts
 * And keep adding them on live sync
 */
const prepareTable = async () => {
  using client = await pool.connect()
  const lastAccountQ = await client.queryObject<{ account: number }>(
    `SELECT account FROM hafsql.accounts_table ORDER BY account DESC LIMIT 1`,
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
      `INSERT INTO hafsql.accounts_table (account) SELECT id FROM hive.accounts WHERE id > $1`,
      [lastAccount],
    )
  }
}

const fillAccounts = async () => {
  let blockRange = await getBlockRange('accounts')
  while (blockRange) {
    await prepareTable()
    const data = await getData(blockRange)
    await processData(data, blockRange)
    blockRange = await getBlockRange('accounts')
  }
}

const getData = async (blockRange: number[]) => {
  using client = await pool.connect()
  const accountCreated = await client.queryObject<AccountCreated>(
    `SELECT new_account_name, creator, timestamp, block_num, op_id FROM hafsql.vo_account_created
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const accountCreate = await client.queryObject<AccountCreate>(
    `SELECT new_account_name, owner, active, posting, memo_key, json_metadata, block_num, op_id FROM hafsql.op_account_create
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
    UNION ALL
      SELECT new_account_name, owner, active, posting, memo_key, json_metadata, block_num, op_id FROM hafsql.op_account_create_with_delegation
        WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
        AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
    UNION ALL
      SELECT new_account_name, owner, active, posting, memo_key, json_metadata, block_num, op_id FROM hafsql.op_create_claimed_account
        WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
        AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
    ORDER BY op_id;`,
  )
  const accountUpdate = await client.queryObject<AccountUpdate>(
    `SELECT account, owner, active, posting, memo_key, json_metadata, timestamp, block_num, op_id FROM hafsql.op_account_update
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const accountUpdate2 = await client.queryObject<AccountUpdate2>(
    `SELECT account, json_metadata, posting_json_metadata, timestamp, block_num, op_id FROM hafsql.op_account_update2
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const accountWitnessProxy = await client.queryObject<WitnessProxy>(
    `SELECT account, proxy, block_num, op_id FROM hafsql.op_account_witness_proxy
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const proxyCleared = await client.queryObject<WitnessProxy>(
    `SELECT account, proxy, block_num, op_id FROM hafsql.vo_proxy_cleared
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const changedRecoveryAccount = await client.queryObject<ChangedRecovery>(
    `SELECT account, new_recovery_account, timestamp, block_num, op_id FROM hafsql.vo_changed_recovery_account
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const setWithdrawVestingRoute = await client.queryObject<WithdrawRoute>(
    `SELECT from_account, to_account, percent, auto_vest, block_num, op_id FROM hafsql.op_setwithdraw_vesting_route
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const recoverAccount = await client.queryObject<RecoverAccount>(
    `SELECT account_to_recover, new_owner_authority, block_num, op_id FROM hafsql.op_recover_account
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )
  const pow = await client.queryObject<Pow>(
    `SELECT worker_account, work ->>'worker' AS worker, block_num, op_id FROM hafsql.op_pow
      WHERE op_id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND op_id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY op_id;`,
  )

  const data: AccountsData[] = []
  accountCreated.rows.forEach((element) => {
    data.push({ ...element, type: 'account_created' })
  })
  accountCreate.rows.forEach((element) => {
    data.push({ ...element, type: 'account_create' })
  })
  accountUpdate.rows.forEach((element) => {
    data.push({ ...element, type: 'account_update' })
  })
  accountUpdate2.rows.forEach((element) => {
    data.push({ ...element, type: 'account_update2' })
  })
  accountWitnessProxy.rows.forEach((element) => {
    data.push({ ...element, type: 'account_witness_proxy' })
  })
  proxyCleared.rows.forEach((element) => {
    data.push({ ...element, type: 'proxy_cleared' })
  })
  changedRecoveryAccount.rows.forEach((element) => {
    data.push({ ...element, type: 'changed_recovery_account' })
  })
  setWithdrawVestingRoute.rows.forEach((element) => {
    data.push({ ...element, type: 'set_withdraw_vesting_route' })
  })
  recoverAccount.rows.forEach((element) => {
    data.push({ ...element, type: 'recover_account' })
  })
  pow.rows.forEach((element) => {
    data.push({ ...element, type: 'pow' })
  })

  data.sort((a, b) => {
    if (a.op_id > b.op_id) {
      return 1
    } else if (a.op_id < b.op_id) {
      return -1
    } else {
      return 0
    }
  })

  return data
}

const processData = async (data: AccountsData[], blockRange: number[]) => {
  using client = await pool.connect()
  const trx = client.createTransaction('hafsql_accounts_sync')
  await trx.begin()
  data.forEach(async (element) => {
    const { type } = element
    if (type === 'account_created') {
      // new_account_name, creator, timestamp
      const new_account_name = <string> element.new_account_name
      const creator = <string> element.creator
      const timestamp = <string> element.timestamp
      const accountId = await getUserId(new_account_name, trx)
      const creatorId = await getUserId(creator, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET creator=$1, recovery=$2, created_at=$3, last_owner_update=$4 WHERE account=$5`,
        [creatorId, creatorId, timestamp, timestamp, accountId],
      )
    } else if (type === 'account_create') {
      // new_account_name, owner, active, posting, memo_key, json_metadata
      const new_account_name = <string> element.new_account_name
      const owner = <string> element.owner
      const active = <string> element.active
      const posting = <string> element.posting
      const memo_key = <string> element.memo_key
      const json_metadata = cleanJson(<string> element.json_metadata)
      const accountId = await getUserId(new_account_name, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET owner=$1, active=$2, posting=$3, memo_key=$4, json_metadata=$5 WHERE account=$6`,
        [owner, active, posting, memo_key, json_metadata, accountId],
      )
    } else if (type === 'account_update') {
      // account, owner, active, posting, memo_key, json_metadata, timestamp
      const account = <string> element.account
      const owner = <string> element.owner
      const active = <string> element.active
      const posting = <string> element.posting
      const memo_key = <string> element.memo_key
      const timestamp = <string> element.timestamp
      const json_metadata = cleanJson(<string> element.json_metadata)
      const accountId = await getUserId(account, trx)
      let additional = ''
      const addParams = []
      let i = 0
      const paramsStart = 5
      if (owner) {
        additional += `owner=$${paramsStart + i} ,`
        addParams.push(owner)
        i++
        additional += `last_owner_update=$${paramsStart + i} ,`
        addParams.push(timestamp)
        i++
      }
      if (active) {
        additional += `active=$${paramsStart + i} ,`
        addParams.push(active)
        i++
      }
      if (posting) {
        additional += `posting=$${paramsStart + i} ,`
        addParams.push(posting)
      }
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET ${additional} memo_key=$1, json_metadata=$2, last_update=$3 WHERE account=$4`,
        [memo_key, json_metadata, timestamp, accountId, ...addParams],
      )
    } else if (type === 'account_update2') {
      // account, json_metadata, posting_json_metadata, timestamp
      const account = <string> element.account
      const timestamp = <string> element.timestamp
      const json_metadata = cleanJson(<string> element.json_metadata)
      const posting_metadata = cleanJson(<string> element.posting_json_metadata)
      const accountId = await getUserId(account, trx)
      let additional = ''
      const addParams = []
      if (element.json_metadata) {
        additional += `json_metadata=$4 ,`
        addParams.push(json_metadata)
      }
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET ${additional} posting_metadata=$1, last_update=$2 WHERE account=$3`,
        [posting_metadata, accountId, timestamp, ...addParams],
      )
    } else if (type === 'recover_account') {
      // account_to_recover, new_owner_authority
      const account = <string> element.account_to_recover
      const owner = <string> element.new_owner_authority
      const accountId = await getUserId(account, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET owner=$1 WHERE account=$2`,
        [owner, accountId],
      )
    } else if (type === 'changed_recovery_account') {
      // account, new_recovery_account, timestamp
      const account = <string> element.account
      const new_recovery_account = <string> element.new_recovery_account
      const timestamp = <string> element.timestamp
      const accountId = await getUserId(account, trx)
      const recoveryId = await getUserId(new_recovery_account, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET recovery=$1, last_owner_update=$2 WHERE account=$3`,
        [recoveryId, timestamp, accountId],
      )
    } else if (type === 'set_withdraw_vesting_route') {
      // from_account, to_account, percent, auto_vest
      const from_account = <string> element.from_account
      const to_account = <string> element.to_account
      const percent = <number> element.percent
      const auto_vest = <boolean> element.auto_vest
      const accountId = await getUserId(from_account, trx)
      if (percent === 0) {
        // remove
        await trx.queryObject(
          `UPDATE hafsql.accounts_table SET withdraw_routes = (SELECT jsonb_agg(value) FROM jsonb_array_elements(withdraw_routes) w WHERE w->>'to_account' != $1)
            WHERE account=$2`,
          [to_account, accountId],
        )
      } else {
        const temp = JSON.stringify([{
          from_account,
          to_account,
          percent,
          auto_vest,
        }])
        await trx.queryObject(
          `UPDATE hafsql.accounts_table SET withdraw_routes = COALESCE(withdraw_routes, '[]'::jsonb) || $1::jsonb
            WHERE account=$2`,
          [temp, accountId],
        )
      }
    } else if (type === 'account_witness_proxy') {
      // account, proxy
      const account = <string> element.account
      const proxy = <string> element.proxy
      const accountId = await getUserId(account, trx)
      const proxyId = await getUserId(proxy, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET proxy=$1 WHERE account=$2`,
        [proxyId, accountId],
      )
    } else if (type === 'proxy_cleared') {
      // account, proxy
      const account = <string> element.account
      const accountId = await getUserId(account, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET proxy=$1 WHERE account=$2`,
        [null, accountId],
      )
    } else if (type === 'pow') {
      // worker_account, worker
      const account = <string> element.worker_account
      const key = <string> element.worker
      const publicKey = JSON.stringify({
        account_auths: [],
        key_auths: [[key, 1]],
        weight_threshold: 1,
      })
      const accountId = await getUserId(account, trx)
      await trx.queryObject(
        `UPDATE hafsql.accounts_table SET owner=$1, active=$1, posting=$1, memo_key=$2 WHERE account=$3 AND owner IS NULL`,
        [publicKey, key, accountId],
      )
    }
  })
  await updateLastBlockNum('accounts', blockRange[1], trx)
  await trx.commit()
}

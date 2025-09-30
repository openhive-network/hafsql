import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { getUserId } from '../helpers/utils/get_user_id.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import {
	AccountCreate,
	AccountCreated,
	AccountsData,
	AccountUpdate,
	AccountUpdate2,
	AuthorReward,
	ChangedRecovery,
	ClaimReward,
	CurationReward,
	FillVestingWithdraw,
	Pow,
	RecoverAccount,
	WithdrawRoute,
	WithdrawVesting,
	WitnessProxy,
} from '../helpers/types.ts'
import { createAccountsIndexes } from '../indexes/hafsql_indexes.ts'
import { customClient, query, transaction } from '../helpers/database.ts'

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
 * Fill the accounts table with the account ids from hafd.accounts
 * And keep adding them on live sync
 */
const prepareTable = async () => {
	const lastAccountQ = await query<{ account: number }>(
		`SELECT account FROM hafsql.accounts_table ORDER BY account DESC LIMIT 1`,
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
			`INSERT INTO hafsql.accounts_table (account) SELECT id FROM hafd.accounts WHERE id > $1`,
			[lastAccount],
		)
	}
}

let massiveSync = true
const fillAccounts = async () => {
	let blockRange = await getBlockRange('accounts')
	if (blockRange && blockRange[1] - blockRange[0] < 49999) {
		massiveSync = false
	}
	while (blockRange) {
		await prepareTable()
		const data = await getData(blockRange)
		await processData(data, blockRange)
		blockRange = await getBlockRange('accounts')
	}
}

const getData = async (blockRange: number[]) => {
	const accountCreated = await query<AccountCreated>(
		`SELECT new_account_name, creator, hafsql.get_timestamp(id) AS timestamp, id FROM hafsql.operation_account_created_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const accountCreate = await query<AccountCreate>(
		`SELECT new_account_name, owner, active, posting, memo_key, json_metadata, id FROM hafsql.operation_account_create_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
    UNION ALL
      SELECT new_account_name, owner, active, posting, memo_key, json_metadata, id FROM hafsql.operation_account_create_with_delegation_table
        WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
        AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
    UNION ALL
      SELECT new_account_name, owner, active, posting, memo_key, json_metadata, id FROM hafsql.operation_create_claimed_account_table
        WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
        AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
    ORDER BY id;`,
	)
	const accountUpdate = await query<AccountUpdate>(
		`SELECT account, owner, active, posting, memo_key, json_metadata, hafsql.get_timestamp(id) as timestamp, id FROM hafsql.operation_account_update_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const accountUpdate2 = await query<AccountUpdate2>(
		`SELECT account, owner, active, posting, memo_key, json_metadata, posting_json_metadata, hafsql.get_timestamp(id) AS timestamp, id FROM hafsql.operation_account_update2_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const accountWitnessProxy = await query<WitnessProxy>(
		`SELECT account, proxy, id FROM hafsql.operation_account_witness_proxy_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const proxyCleared = await query<WitnessProxy>(
		`SELECT account, proxy, id FROM hafsql.operation_proxy_cleared_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const changedRecoveryAccount = await query<ChangedRecovery>(
		`SELECT account, new_recovery_account, hafsql.get_timestamp(id) AS timestamp, id FROM hafsql.operation_changed_recovery_account_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const setWithdrawVestingRoute = await query<WithdrawRoute>(
		`SELECT from_account, to_account, percent, auto_vest, id FROM hafsql.operation_set_withdraw_vesting_route_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const recoverAccount = await query<RecoverAccount>(
		`SELECT account_to_recover, new_owner_authority, id FROM hafsql.operation_recover_account_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const pow = await query<Pow>(
		`SELECT worker_account, work ->>'worker' AS worker, id FROM hafsql.operation_pow_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	const authorReward = await query<AuthorReward>(
		`SELECT author AS account, hbd_payout, hive_payout, vesting_payout, id FROM hafsql.operation_author_reward_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      AND payout_must_be_claimed = true
      UNION ALL
      SELECT benefactor AS account, hbd_payout, hive_payout, vesting_payout, id FROM hafsql.operation_comment_benefactor_reward_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      AND payout_must_be_claimed = true
      ORDER BY id;`,
	)
	const curationReward = await query<CurationReward>(
		`SELECT curator AS account, reward, id FROM hafsql.operation_curation_reward_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      AND payout_must_be_claimed = true
      ORDER BY id;`,
	)
	const claimReward = await query<ClaimReward>(
		`SELECT account, reward_hive, reward_hbd, reward_vests, id FROM hafsql.operation_claim_reward_balance_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      ORDER BY id;`,
	)
	// 13 weeks ago = 2620800 blocks ago
	// process only the last 13 weeks - older withdraws are already done at this point
	const headBlock = (await query<{ block_num: number }>(
		`SELECT block_num FROM hafsql.haf_blocks ORDER BY block_num DESC LIMIT 1;`,
	)).rows[0].block_num
	const weeksAgo13 = (headBlock - 2620800) || 0
	const withdrawVesting = await query<WithdrawVesting>(
		`SELECT account, vesting_shares, hafsql.get_timestamp(id) AS timestamp, id FROM hafsql.operation_withdraw_vesting_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      AND id >= hafsql.first_op_id_from_block_num(${weeksAgo13})
      ORDER BY id;`,
	)
	const fillVestingWithdraw = await query<FillVestingWithdraw>(
		`SELECT from_account AS account, withdrawn, hafsql.get_timestamp(id) AS timestamp, id FROM hafsql.operation_fill_vesting_withdraw_table
      WHERE id >= hafsql.first_op_id_from_block_num(${blockRange[0]})
      AND id <= hafsql.last_op_id_from_block_num(${blockRange[1]})
      AND id >= hafsql.first_op_id_from_block_num(${weeksAgo13})
      ORDER BY id;`,
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
	authorReward.rows.forEach((element) => {
		data.push({ ...element, type: 'author_reward' })
	})
	curationReward.rows.forEach((element) => {
		data.push({ ...element, type: 'curation_reward' })
	})
	claimReward.rows.forEach((element) => {
		data.push({ ...element, type: 'claim_reward' })
	})
	withdrawVesting.rows.forEach((element) => {
		data.push({ ...element, type: 'withdraw_vesting' })
	})
	fillVestingWithdraw.rows.forEach((element) => {
		data.push({ ...element, type: 'fill_vesting_withdraw' })
	})

	data.sort((a, b) => {
		if (a.id > b.id) {
			return 1
		} else if (a.id < b.id) {
			return -1
		} else {
			return 0
		}
	})

	return data
}

const processData = async (data: AccountsData[], blockRange: number[]) => {
	await transaction(async (client) => {
		for (const element of data) {
			const { type } = element
			if (type === 'account_created') {
				await handleAccountCreated(element, client)
			} else if (type === 'account_create') {
				await handleAccountCreate(element, client)
			} else if (type === 'account_update') {
				await handleAccountUpdate(element, client)
			} else if (type === 'account_update2') {
				await handleAccountUpdate2(element, client)
			} else if (type === 'recover_account') {
				await handleRecoverAccount(element, client)
			} else if (type === 'changed_recovery_account') {
				await handleChangedRecovery(element, client)
			} else if (type === 'set_withdraw_vesting_route') {
				await handleSetWithdrawRoute(element, client)
			} else if (type === 'account_witness_proxy') {
				await handleWitnessProxy(element, client)
			} else if (type === 'proxy_cleared') {
				await handleProxyCleared(element, client)
			} else if (type === 'pow') {
				await handlePow(element, client)
			} else if (type === 'author_reward') {
				await handleAuthorReward(element, client)
			} else if (type === 'curation_reward') {
				await handleCurationReward(element, client)
			} else if (type === 'claim_reward') {
				await handleClaimReward(element, client)
			} else if (type === 'withdraw_vesting') {
				await handleWithdrawVesting(element, client)
			} else if (type === 'fill_vesting_withdraw') {
				await handleFillVestingWithdraw(element, client)
			}
		}
		if (massiveSync) {
			await processRewards(client)
		}
		await updateLastBlockNum('accounts', blockRange[1], client)
	})
}

const rewardsCache: Record<
	string,
	{ reward_hive: string; reward_hbd: string; reward_vests: string }
> = {}
const processRewards = async (client: customClient) => {
	const keys = Object.keys(rewardsCache)
	for (let i = 0; i < keys.length; i++) {
		const accountId = keys[i]
		const { reward_hbd, reward_hive, reward_vests } = rewardsCache[accountId]
		await client.query(
			`UPDATE hafsql.accounts_table SET reward_hive_balance = reward_hive_balance + $1,
        reward_hbd_balance = reward_hbd_balance + $2, reward_vests_balance = reward_vests_balance + $3
        WHERE account = $4`,
			[reward_hive, reward_hbd, reward_vests, accountId],
		)
		delete rewardsCache[accountId]
	}
}

const handleAccountCreated = async (
	element: AccountsData,
	client: customClient,
) => {
	// new_account_name, creator, timestamp
	const new_account_name = <string> element.new_account_name
	const creator = <string> element.creator
	const timestamp = element.timestamp
	const accountId = await getUserId(new_account_name, client)
	const creatorId = await getUserId(creator, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET creator=$1, recovery=$2, created_at=$3 WHERE account=$4`,
		[creatorId, creatorId, timestamp, accountId],
	)
}

const handleAccountCreate = async (
	element: AccountsData,
	client: customClient,
) => {
	// new_account_name, owner, active, posting, memo_key, json_metadata
	const new_account_name = <string> element.new_account_name
	const owner = element.owner
	const active = element.active
	const posting = element.posting
	const memo_key = element.memo_key
	// hafsql.to_json should take care of cleaning this json
	const json_metadata = JSON.stringify(element.json_metadata)
	const accountId = await getUserId(new_account_name, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET owner=$1, active=$2, posting=$3, memo_key=$4, json_metadata=$5 WHERE account=$6`,
		[owner, active, posting, memo_key, json_metadata, accountId],
	)
}

const handleAccountUpdate = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, owner, active, posting, memo_key, json_metadata, timestamp
	const account = <string> element.account
	const owner = <object> element.owner
	const active = element.active
	const posting = element.posting
	const memo_key = element.memo_key
	const timestamp = element.timestamp
	const json_metadata = JSON.stringify(element.json_metadata)
	const accountId = await getUserId(account, client)
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
	await client.query(
		`UPDATE hafsql.accounts_table SET ${additional} memo_key=$1, json_metadata=$2, last_update=$3 WHERE account=$4`,
		[memo_key, json_metadata, timestamp, accountId, ...addParams],
	)
}

const handleAccountUpdate2 = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, json_metadata, posting_json_metadata, timestamp
	const account = <string> element.account
	const timestamp = element.timestamp
	const json_metadata = JSON.stringify(element.json_metadata)
	const posting_metadata = JSON.stringify(element.posting_json_metadata)
	const owner = <object> element.owner
	const active = element.active
	const posting = element.posting
	const memo_key = element.memo_key
	const accountId = await getUserId(account, client)
	let additional = ''
	const addParams = []
	let i = 0
	const paramsStart = 4
	if (element.json_metadata) {
		additional += `json_metadata=$${paramsStart + i} ,`
		addParams.push(json_metadata)
		i++
	}
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
		i++
	}
	if (memo_key) {
		additional += `memo_key=$${paramsStart + i} ,`
		addParams.push(memo_key)
	}
	await client.query(
		`UPDATE hafsql.accounts_table SET ${additional} posting_metadata=$1, last_update=$2 WHERE account=$3`,
		[posting_metadata, timestamp, accountId, ...addParams],
	)
}

const handleRecoverAccount = async (
	element: AccountsData,
	client: customClient,
) => {
	const account = <string> element.account_to_recover
	const owner = element.new_owner_authority
	const accountId = await getUserId(account, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET owner=$1 WHERE account=$2`,
		[owner, accountId],
	)
}

const handleChangedRecovery = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, new_recovery_account, timestamp
	const account = <string> element.account
	const new_recovery_account = <string> element.new_recovery_account
	const timestamp = element.timestamp
	const accountId = await getUserId(account, client)
	const recoveryId = await getUserId(new_recovery_account, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET recovery=$1, last_owner_update=$2 WHERE account=$3`,
		[recoveryId, timestamp, accountId],
	)
}

const handleSetWithdrawRoute = async (
	element: AccountsData,
	client: customClient,
) => {
	// from_account, to_account, percent, auto_vest
	const from_account = <string> element.from_account
	const to_account = element.to_account
	const percent = element.percent
	const auto_vest = element.auto_vest
	const accountId = await getUserId(from_account, client)
	if (percent === 0) {
		// remove
		await client.query(
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
		await client.query(
			`UPDATE hafsql.accounts_table SET withdraw_routes = COALESCE(withdraw_routes, '[]'::jsonb) || $1::jsonb
            WHERE account=$2`,
			[temp, accountId],
		)
	}
}

const handleWitnessProxy = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, proxy
	const account = <string> element.account
	const proxy = <string> element.proxy
	const accountId = await getUserId(account, client)
	const proxyId = await getUserId(proxy, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET proxy=$1 WHERE account=$2`,
		[proxyId, accountId],
	)
}

const handleProxyCleared = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, proxy
	const account = <string> element.account
	const accountId = await getUserId(account, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET proxy=$1 WHERE account=$2`,
		[null, accountId],
	)
}

const handlePow = async (element: AccountsData, client: customClient) => {
	// worker_account, worker
	const account = <string> element.worker_account
	const key = element.worker
	const publicKey = JSON.stringify({
		account_auths: [],
		key_auths: [[key, 1]],
		weight_threshold: 1,
	})
	const accountId = await getUserId(account, client)
	await client.query(
		`UPDATE hafsql.accounts_table SET owner=$1, active=$1, posting=$1, memo_key=$2 WHERE account=$3 AND owner IS NULL`,
		[publicKey, key, accountId],
	)
}

const handleAuthorReward = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, hbd_payout, hive_payout, vesting_payout
	const account = <string> element.account
	const hbd_payout = <string> element.hbd_payout
	const hive_payout = <string> element.hive_payout
	const vesting_payout = <string> element.vesting_payout
	const accountId = <number> await getUserId(account, client)
	if (accountId < 4) {
		return
	}
	if (massiveSync) {
		if (!Object.hasOwn(rewardsCache, accountId)) {
			rewardsCache[accountId] = {
				reward_hbd: hbd_payout,
				reward_hive: hive_payout,
				reward_vests: vesting_payout,
			}
		} else {
			// Number should be fine unless proven otherwise
			if (Number(hbd_payout) !== 0) {
				rewardsCache[accountId].reward_hbd =
					(Number(rewardsCache[accountId].reward_hbd) + Number(hbd_payout))
						.toString()
			}
			if (Number(hive_payout) !== 0) {
				rewardsCache[accountId].reward_hive =
					(Number(rewardsCache[accountId].reward_hive) +
						Number(hive_payout))
						.toString()
			}
			if (Number(vesting_payout) !== 0) {
				rewardsCache[accountId].reward_vests =
					(Number(rewardsCache[accountId].reward_vests) +
						Number(vesting_payout))
						.toString()
			}
		}
	} else {
		await client.query(
			`UPDATE hafsql.accounts_table SET reward_hive_balance = reward_hive_balance + $1,
        reward_hbd_balance = reward_hbd_balance + $2, reward_vests_balance = reward_vests_balance + $3
        WHERE account = $4`,
			[hive_payout, hbd_payout, vesting_payout, accountId],
		)
	}
}

const handleCurationReward = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, reward
	const account = <string> element.account
	const reward = <string> element.reward
	const accountId = <number> await getUserId(account, client)
	if (accountId < 4) {
		return
	}
	if (massiveSync) {
		if (!Object.hasOwn(rewardsCache, accountId)) {
			rewardsCache[accountId] = {
				reward_hbd: '0',
				reward_hive: '0',
				reward_vests: reward,
			}
		} else {
			rewardsCache[accountId].reward_vests =
				(Number(rewardsCache[accountId].reward_vests) + Number(reward))
					.toString()
		}
	} else {
		await client.query(
			`UPDATE hafsql.accounts_table SET reward_vests_balance = reward_vests_balance + $1
        WHERE account = $2`,
			[reward, accountId],
		)
	}
}

const handleClaimReward = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, reward_hive, reward_hbd, reward_vests
	const account = <string> element.account
	const reward_hive = <string> element.reward_hive
	const reward_hbd = <string> element.reward_hbd
	const reward_vests = <string> element.reward_vests
	const accountId = <number> await getUserId(account, client)
	if (accountId < 4) {
		return
	}
	if (massiveSync) {
		if (!Object.hasOwn(rewardsCache, accountId)) {
			rewardsCache[accountId] = {
				reward_hbd: `-${reward_hbd}`,
				reward_hive: `-${reward_hive}`,
				reward_vests: `-${reward_vests}`,
			}
		} else {
			if (Number(reward_hive) !== 0) {
				rewardsCache[accountId].reward_hive =
					(Number(rewardsCache[accountId].reward_hive) -
						Number(reward_hive))
						.toString()
			}
			if (Number(reward_hbd) !== 0) {
				rewardsCache[accountId].reward_hbd =
					(Number(rewardsCache[accountId].reward_hbd) - Number(reward_hbd))
						.toString()
			}
			if (Number(reward_vests) !== 0) {
				rewardsCache[accountId].reward_vests =
					(Number(rewardsCache[accountId].reward_vests) -
						Number(reward_vests))
						.toString()
			}
		}
	} else {
		await client.query(
			`UPDATE hafsql.accounts_table SET reward_hive_balance = reward_hive_balance - $1,
            reward_hbd_balance = reward_hbd_balance - $2, reward_vests_balance = reward_vests_balance - $3
            WHERE account = $4`,
			[reward_hive, reward_hbd, reward_vests, accountId],
		)
	}
}

const handleWithdrawVesting = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, vesting_shares, timestamp
	const account = <string> element.account
	const vesting_shares = element.vesting_shares
	const timestamp = <string> element.timestamp
	const accountId = await getUserId(account)
	if (Number(vesting_shares) === 0) {
		await client.query(
			`UPDATE hafsql.accounts_table SET to_withdraw=$1, vesting_withdraw_rate=$1, withdrawn=$1, next_vesting_withdrawal=$2
        WHERE account=$3`,
			[0, null, accountId],
		)
		return
	}
	// 1 week - 3 seconds
	// because the actual timestamp of operations is -3 of the blocks
	const withdrawalInterval = 604797000
	const nextWithdrawal = new Date(
		new Date(timestamp + 'Z').getTime() + withdrawalInterval,
	).toISOString()
	await client.query(
		`UPDATE hafsql.accounts_table SET to_withdraw=$1, vesting_withdraw_rate=$2::numeric/13, next_vesting_withdrawal=$3
      WHERE account = $4`,
		[vesting_shares, vesting_shares, nextWithdrawal, accountId],
	)
}

const handleFillVestingWithdraw = async (
	element: AccountsData,
	client: customClient,
) => {
	// account, withdrawn, "timestamp"
	const account = <string> element.account
	const withdrawn = element.withdrawn
	const timestamp = <string> element.timestamp
	const accountId = await getUserId(account)
	const isLastOne = (await client.query<{ is_last: boolean }>(
		`SELECT to_withdraw - $1::numeric <= 0 AS is_last FROM hafsql.accounts_table WHERE account = $2`,
		[withdrawn, accountId],
	)).rows[0].is_last
	if (isLastOne) {
		await client.query(
			`UPDATE hafsql.accounts_table SET to_withdraw=$1, vesting_withdraw_rate=$1, withdrawn=$1, next_vesting_withdrawal=$2
        WHERE account=$3`,
			[0, null, accountId],
		)
		return
	}
	const withdrawalInterval = 604797000
	const nextWithdrawal = new Date(
		new Date(timestamp + 'Z').getTime() + withdrawalInterval,
	).toISOString()
	await client.query(
		`UPDATE hafsql.accounts_table SET
      to_withdraw = to_withdraw - $1,
      vesting_withdraw_rate = LEAST(to_withdraw - $1, vesting_withdraw_rate),
      next_vesting_withdrawal = $2,
      withdrawn = withdrawn + $1
      WHERE account = $3`,
		[withdrawn, nextWithdrawal, accountId],
	)
}

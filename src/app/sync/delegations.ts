import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { Delegations, HardforkHive } from '../helpers/types.ts'
import { createDelegationsIndexes } from '../indexes/hafsql.ts'
import { customClient, query, transaction } from '../helpers/database.ts'

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[HP Delegations] Start massive sync... ⏳')
			syncDelegations()
		}
	}
}

let firstRun = true
const syncDelegations = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillDelegations()
		print('[HP Delegations] Massive sync done ✅')
		print('[HP Delegations] Creating indexes... ⏳')
		await createDelegationsIndexes()
		print('[HP Delegations] Indexes have been created ✅')
		print('[HP Delegations] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillDelegations()
	await sleep(intervalTime)
	syncDelegations()
}

export const fillDelegations = async () => {
	let blockRange = await getBlockRange('delegations')
	while (blockRange) {
		const delegations = await getDelegations(blockRange)
		await insertDelegations(delegations, blockRange)
		blockRange = await getBlockRange('delegations')
	}
}

// hafsql.op_account_create_with_delegation
const getDelegations = async (blockRange: number[]) => {
	const result = await query<Delegations>(
		`SELECT delegator, delegatee, vesting_shares, hafsql.get_timestamp(id) AS timestamp, id FROM hafsql.operation_delegate_vesting_shares_table
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      UNION ALL
      SELECT creator AS delegator, new_account_name AS delegatee, delegation AS vesting_shares, hafsql.get_timestamp(id) AS timestamp, id
      FROM hafsql.operation_account_create_with_delegation_table
      WHERE id >= hafsql.first_op_id_from_block_num($1)
      AND id <= hafsql.last_op_id_from_block_num($2)
      ORDER BY id ASC`,
		[blockRange[0], blockRange[1]],
	)
	return result.rows
}

const insertDelegations = async (
	delegations: Delegations[],
	blockRange: number[],
) => {
	await transaction(async (client) => {
		for (let i = 0; i < delegations.length; i++) {
			const { delegator, delegatee, vesting_shares, timestamp } = delegations[i]
			if (Number(vesting_shares) === Number(0)) {
				await client.query(
					`DELETE FROM hafsql.delegations_table
            WHERE delegator=$1 AND delegatee=$2;`,
					[delegator, delegatee],
				)
			} else {
				await client.query(
					`INSERT INTO hafsql.delegations_table (delegator, delegatee, vests, timestamp)
            VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT hafsql_delegations_table_un
            DO UPDATE SET vests=$3, timestamp=$4;`,
					[delegator, delegatee, vesting_shares, timestamp],
				)
			}
		}
		if (41818752 >= blockRange[0] && 41818752 <= blockRange[1]) {
			// clear hardfork_hive accounts delegations
			await clearHiveForkDelegations(client)
		}
		await updateLastBlockNum('delegations', blockRange[1], client)
	})
}

const clearHiveForkDelegations = async (client: customClient) => {
	const result = await client.query<HardforkHive>(
		`SELECT account, hbd_transferred, hive_transferred, vests_converted FROM hafsql.operation_hardfork_hive_table`,
	)
	for (let i = 0; i < result.rows.length; i++) {
		const { account } = result.rows[i]
		await client.query(
			`DELETE FROM hafsql.delegations_table
        WHERE delegator=$1;`,
			[account],
		)
	}
}

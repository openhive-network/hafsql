import { BigJSONparser } from '../../deps.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'
import {
	RcCustomJson,
	RcDelegation,
	RcDelegationAppended,
} from '../helpers/types.ts'
import { clearUsername } from '../helpers/utils/validate_username.ts'
import { createRCDelegationsIndexes } from '../indexes/hafsql_indexes.ts'
import { getBlockRange } from '../helpers/utils/get_block_range.ts'
import { updateLastBlockNum } from '../helpers/utils/update_last_block_num.ts'
import { query, transaction } from '../helpers/database.ts'

// Need this to handle large RC numbers

let started = false
// Run this file in a separate worker thread than the main application
// Start when receiving a command "start"
// @ts-ignore: lack of types in deno
self.onmessage = (e: MessageEvent) => {
	if (e.data === 'start') {
		if (!started) {
			started = true
			print('[RC Delegations] Start massive sync... ⏳')
			syncRCDelegations()
		}
	}
}

let firstRun = true
const syncRCDelegations = async () => {
	const intervalTime = 250
	if (firstRun) {
		firstRun = false
		await fillRCDelegations()
		print('[RC Delegations] Massive sync done ✅')
		print('[RC Delegations] Creating indexes... ⏳')
		await createRCDelegationsIndexes()
		print('[RC Delegations] Indexes have been created ✅')
		print('[RC Delegations] Switched to live sync 🟢')
		await sleep(intervalTime)
	}
	await fillRCDelegations()
	await sleep(intervalTime)
	syncRCDelegations()
}

export const fillRCDelegations = async () => {
	let blockRange = await getBlockRange('rc_delegations')
	while (blockRange) {
		const delegations = await getRCDelegations(blockRange)
		await insertRCDelegations(delegations, blockRange)
		blockRange = await getBlockRange('rc_delegations')
	}
}

const getRCDelegations = async (blockRange: number[]) => {
	const result = await query<RcCustomJson>(
		`SELECT json, timestamp FROM hafsql.operation_custom_json_view
    WHERE custom_id=$1
    AND id >= hafsql.first_op_id_from_block_num($2)
    AND id <= hafsql.last_op_id_from_block_num($3)
    ORDER BY id ASC`,
		['rc', blockRange[0], blockRange[1]],
	)
	if (result.rows.length <= 0) {
		return []
	}
	// Validating RC delegtaion
	// ["delegate_rc",{"from":"hiveonboard","delegatees":["ivirm0214"],"max_rc":10000000000}]
	// [["delegate_rc",{"from":"hiveonboard","delegatees":["ivirm0214"],"max_rc":10000000000}]]
	const delegationsArray = []
	for (let i = 0; i < result.rows.length; i++) {
		const rcDelegation = result.rows[i]
		const timestamp = rcDelegation.timestamp
		try {
			const parsedJson: RcDelegation = BigJSONparser(rcDelegation.json)
			if (!Array.isArray(parsedJson)) {
				continue
			}
			if (parsedJson.length < 1) {
				continue
			}
			if (Array.isArray(parsedJson[0])) {
				// multiple delegations
				for (let k = 0; k < parsedJson.length; k++) {
					const delegation = extractRCDelegationFromArray(
						parsedJson[k],
						timestamp,
					)
					if (delegation !== null) {
						delegationsArray.push(delegation)
					}
				}
			} else {
				const delegation = extractRCDelegationFromArray(parsedJson, timestamp)
				if (delegation !== null) {
					delegationsArray.push(delegation)
				}
			}
		} catch (_e) {
			continue
		}
	}
	return delegationsArray
}

const extractRCDelegationFromArray = (arr: RcDelegation, timestamp: string) => {
	if (arr[0] !== 'delegate_rc' && arr[0] !== 0) {
		return null
	}
	// We assume the delegation is valid because it is included in the blocks
	const { from, delegatees } = arr[1]
	let max_rc = arr[1].max_rc
	if (typeof max_rc === 'undefined' || max_rc === null) {
		max_rc = '0'
	}
	return {
		from,
		delegatees,
		max_rc,
		timestamp,
	}
}

const insertRCDelegations = async (
	delegations: RcDelegationAppended[],
	blockRange: number[],
) => {
	await transaction(async (client) => {
		for (let i = 0; i < delegations.length; i++) {
			const { max_rc, timestamp } = delegations[i]
			const from = clearUsername(delegations[i].from)
			const delegatees = [...new Set(delegations[i].delegatees)]
			for (let k = 0; k < delegatees.length; k++) {
				const delegatee = clearUsername(delegatees[k])
				if (max_rc === '0' || max_rc === 0) {
					await client.query(
						`DELETE FROM hafsql.rc_delegations_table
							WHERE delegator=$1 AND delegatee=$2;`,
						[from, delegatee],
					)
				} else {
					await client.query(
						`INSERT INTO hafsql.rc_delegations_table (delegator, delegatee, rc, timestamp)
							VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT hafsql_rc_delegations_table_un
							DO UPDATE SET rc=$3, timestamp=$4;`,
						[from, delegatee, max_rc, timestamp],
					)
				}
			}
		}
		await updateLastBlockNum('rc_delegations', blockRange[1], client)
	})
}

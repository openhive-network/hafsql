import { doesIndexExist } from '../indexes/hive_indexes.ts'
import { getBlockRange } from './utils/get_block_range.ts'
import { print } from './utils/print.ts'

const isSyncing = {
	one: false,
	two: false,
	three: false,
	four: false,
	five: false,
}

export const createWorkers = async () => {
	// op_type_id id
	if (
		isSyncing.one === false &&
		await doesIndexExist('hafsql_hive_operations_op_type_id_id') &&
		!(await getBlockRange('operations'))
	) {
		isSyncing.one = true
		if (Deno.env.get('HAFSQL_COMMENTS') !== 'false') {
			// comments
			createWorker('../sync/comments.ts').postMessage('start')
			print('[Main] Starting comments worker 👷‍')
		}
		if (Deno.env.get('HAFSQL_PROPOSALS') !== 'false') {
			// proposals
			createWorker('../sync/proposals.ts').postMessage('start')
			print('[Main] Starting proposal worker 👷')
		}
		if (Deno.env.get('HAFSQL_BALANCES') !== 'false') {
			// balances
			createWorker('../sync/balances.ts').postMessage('start')
			print('[Main] Starting balances worker 👷')
		}

		if (Deno.env.get('HAFSQL_ACCOUNTS') !== 'false') {
			// accounts
			createWorker('../sync/accounts.ts').postMessage('start')
			print('[Accounts] Starting accounts worker 👷')
		}
	}

	// custom_json id
	if (
		isSyncing.two === false &&
		await doesIndexExist('hafsql_id_opid_idx') &&
		!(await getBlockRange('operations'))
	) {
		isSyncing.two = true
		if (
			Deno.env.get('HAFSQL_REBLOGS') !== 'false' &&
			Deno.env.get('HAFSQL_COMMENTS') !== 'false'
		) {
			// reblogs
			createWorker('../sync/reblogs.ts').postMessage('start')
			print('[Main] Starting reblogs worker 👷')
		}

		if (Deno.env.get('HAFSQL_RC_DELEGATIONS') !== 'false') {
			// rc_delegations
			createWorker('../sync/rc_delegations.ts').postMessage('start')
			print('[Main] Starting RC delegations worker 👷')
		}
	}

	// author permlink
	if (
		isSyncing.three === false &&
		await doesIndexExist('hafsql_author_permlink_idx') &&
		!(await getBlockRange('operations'))
	) {
		isSyncing.three = true
		if (
			Deno.env.get('HAFSQL_REWARDS') !== 'false' &&
			Deno.env.get('HAFSQL_COMMENTS') !== 'false'
		) {
			// paid_rewards
			createWorker('../sync/paid_rewards.ts').postMessage('start')
			print('[Main] Starting paid_rewards worker 👷')

			// pending_rewards
			createWorker('../sync/pending_rewards.ts').postMessage('start')
			print('[Main] Starting pending_rewards worker 👷')
		}
	}

	// We check for the hive index because sometimes the instance_isready messes it up
	if (
		isSyncing.four === false &&
		(await doesIndexExist('hive_operations_op_type_id_block_num'))
	) {
		isSyncing.four = true
		// operations
		createWorker('../sync/operation_tables.ts').postMessage('start')
		print('[Main] Starting operation tables worker 👷')
	}

	if (isSyncing.five === false && !(await getBlockRange('operations'))) {
		isSyncing.five = true
		if (Deno.env.get('HAFSQL_MARKET') !== 'false') {
			// market
			createWorker('../sync/market.ts').postMessage('start')
			print('[Main] Starting market worker 👷')
		}
	}
}

const createWorker = (path: string) => {
	const worker = new Worker(import.meta.resolve(path), {
		type: 'module',
	})
	worker.onerror = (e) => {
		console.log('Error in worker:', path)
		console.log(e)
		console.log(e.filename, 'At:', e.lineno)
		throw e
	}
	return worker
}

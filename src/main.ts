import { loadDotEnv } from './deps.ts'
import { print } from './helpers/functions/print.ts'
import { createHiveIndexes, doesIndexExist } from './indexes/hive.ts'
import { setup } from './setup/setup.ts'

// Load .env and .env.defaults
await loadDotEnv({ export: true })

// Setup database - create views and tables
await setup()

// Start indexing
print('[Main] Start creating indexes... ⏳')
createHiveIndexes()

// index and sync at the same time
const isSyncing = {
	one: false,
	two: false,
	three: false,
	four: false,
}

// Start workers for each indexer
const main = async () => {
	// op_type_id id
	if (
		isSyncing.one === false &&
		await doesIndexExist('hafsql_hive_operations_op_type_id_id')
	) {
		isSyncing.one = true
		// comments
		createWorker('./sync/comments.ts').postMessage('start')
		print('[Main] Starting comments worker 👷‍')

		// delegations
		createWorker('./sync/delegations.ts').postMessage('start')
		print('[Main] Starting HP delegations worker 👷')

		// proposals
		createWorker('./sync/proposals.ts').postMessage('start')
		print('[Main] Starting proposal worker 👷')
	}

	// custom_json id
	if (
		isSyncing.two === false &&
		await doesIndexExist('hafsql_id_opid_idx')
	) {
		isSyncing.two = true
		// reblogs
		createWorker('./sync/reblogs.ts').postMessage('start')
		print('[Main] Starting reblogs worker 👷')

		// follows
		createWorker('./sync/follows.ts').postMessage('start')
		print('[Main] Starting follows worker 👷')

		// community_roles
		createWorker('./sync/communities.ts').postMessage('start')
		print('[Main] Starting community roles worker 👷')

		// rc_delegations
		createWorker('./sync/rc_delegations.ts').postMessage('start')
		print('[Main] Starting RC delegations worker 👷')
	}

	// author permlink
	if (
		isSyncing.three === false &&
		await doesIndexExist('hafsql_author_permlink_idx')
	) {
		isSyncing.three = true
		// rewards
		createWorker('./sync/rewards.ts').postMessage('start')
		print('[Main] Starting rewards worker 👷')

		// reputations
		createWorker('./sync/reputations.ts').postMessage('start')
		print('[Main] Starting reputations worker 👷')
	}
}

setInterval(main, 5000)

const createWorker = (path: string) => {
	return new Worker(import.meta.resolve(path), {
		type: 'module',
	})
}

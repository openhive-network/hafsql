import { loadDotEnv } from './deps.ts'
import { print } from './helpers/print.ts'
import { createHiveIndexes, isHiveIndexCreated } from './indexes/hive.ts'
import { setup } from './setup/setup.ts'

// Load .env and .env.defaults
await loadDotEnv({ export: true })

// Setup database - create views and tables
await setup()

// Start indexing
createHiveIndexes()

// index and sync at the same time
const isSyncing = {
	comments: false,
	reblogs: false,
	follows: false,
	delegations: false,
	rewards: false,
}

// Start workers for each indexer
const main = () => {
	// op_type_id id
	if (
		isHiveIndexCreated('hafsql_hive_operations_op_type_id_id') &&
		isSyncing.comments === false
	) {
		// sync comments
		isSyncing.comments = true
		const commentWorker = createWorker('./sync/comments.ts')
		print('[Main] Starting comments worker 👷‍')
		commentWorker.postMessage('start')

		// sync delegations
		const delegationWorker = createWorker('./sync/delegations.ts')
		print('[Main] Starting HP delegations worker 👷')
		delegationWorker.postMessage('start')

		// sync proposals
		const proposalWorker = createWorker('./sync/proposals.ts')
		print('[Main] Starting proposal worker 👷')
		proposalWorker.postMessage('start')
	}

	// custom_json id
	if (
		isHiveIndexCreated('hafsql_id_opid_idx') && isSyncing.reblogs === false
	) {
		// sync reblogs
		isSyncing.reblogs = true
		const reblogsWorker = createWorker('./sync/reblogs.ts')
		print('[Main] Starting reblogs worker 👷')
		reblogsWorker.postMessage('start')

		// sync follows
		const followsWorker = createWorker('./sync/follows.ts')
		print('[Main] Starting follows worker 👷')
		followsWorker.postMessage('start')

		// sync rc delegations
		const rcDelegationsWorker = createWorker('./sync/rc_delegations.ts')
		print('[Main] Starting RC delegations worker 👷')
		rcDelegationsWorker.postMessage('start')

		// sync community roles
		const communitiesWorker = createWorker('./sync/communities.ts')
		print('[Main] Starting community roles worker 👷')
		communitiesWorker.postMessage('start')
	}

	// author permlink
	if (
		isHiveIndexCreated('hafsql_author_permlink_idx') &&
		isSyncing.rewards === false
	) {
		// sync rewards
		isSyncing.rewards = true
		const rewardWorker = createWorker('./sync/rewards.ts')
		print('[Main] Starting rewards worker 👷')
		rewardWorker.postMessage('start')
	}
}

setInterval(main, 5000)

const createWorker = (path: string) => {
	return new Worker(import.meta.resolve(path), {
		type: 'module',
	})
}

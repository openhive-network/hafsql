import { startAPI } from './api/start_api.ts'
import { loadDotEnv } from './deps.ts'
import { pool } from './helpers/database.ts'
import { print } from './helpers/functions/print.ts'
import { sleep } from './helpers/functions/sleep.ts'
import { SyncData } from './helpers/types.ts'
import {
	createHiveIndexes,
	doesIndexExist,
	hiveIndexes,
} from './indexes/hive.ts'
import { setup } from './setup/setup.ts'

// Load .env and .env.defaults
await loadDotEnv({ export: true })

const HAFSQL_ASCI = `

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ██╗  ██╗ █████╗ ███████╗███████╗ ██████╗ ██╗          ║
║     ██║  ██║██╔══██╗██╔════╝██╔════╝██╔═══██╗██║          ║
║     ███████║███████║█████╗  ███████╗██║   ██║██║          ║
║     ██╔══██║██╔══██║██╔══╝  ╚════██║██║▄▄ ██║██║          ║
║     ██║  ██║██║  ██║██║     ███████║╚██████╔╝███████╗     ║
║     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚══▀▀═╝ ╚══════╝     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

`

console.log(HAFSQL_ASCI)

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

		// balances
		createWorker('./sync/balances.ts').postMessage('start')
		print('[Main] Starting balances worker 👷')

		// accounts
		createWorker('./sync/accounts.ts').postMessage('start')
		print('[Accounts] Starting accounts worker 👷')
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
		// paid_rewards
		createWorker('./sync/paid_rewards.ts').postMessage('start')
		print('[Main] Starting paid_rewards worker 👷')

		// pending_rewards
		createWorker('./sync/pending_rewards.ts').postMessage('start')
		print('[Main] Starting pending_rewards worker 👷')

		// reputations
		createWorker('./sync/reputations.ts').postMessage('start')
		print('[Main] Starting reputations worker 👷')
	}

	if (isSyncing.four === false) {
		isSyncing.four = true
		// operations
		createWorker('./sync/operation_tables.ts').postMessage('start')
		print('[Main] Starting operation tables worker 👷')
	}
}

let once = false
const entryPoint = async () => {
	using client = await pool.connect()
	const result = await client.queryObject<{ is_ready: boolean }>(
		'SELECT hive.is_instance_ready() AS is_ready;',
	)
	if (result.rows[0]?.is_ready) {
		// Setup database - create views and tables
		await setup()
		print('[Main] Start creating indexes... ⏳')
		createHiveIndexes()
		setInterval(main, 5000)
		setTimeout(printStats, 60000)
		setInterval(printStats, 1800000)
	} else {
		if (!once) {
			print('[Main] Waiting for HAF to be ready... ⏳')
			once = true
		}
		await sleep(5000)
		entryPoint()
	}
}

entryPoint()
// startAPI()

// Log status of the sync every 30min
const printStats = async () => {
	using client = await pool.connect()
	const head = await client.queryObject<{ num: number }>(
		`SELECT num FROM hive.blocks ORDER BY num DESC LIMIT 1;`,
	)
	const headNum = head.rows[0].num
	const result = await client.queryObject<SyncData>(
		`SELECT * FROM hafsql.sync_data;`,
	)
	const temp = 'Waiting for index creation ⏳'
	const syncData = {
		indexes: '',
		delegations: temp,
		rc_delegations: temp,
		proposal_approvals: temp,
		follows: temp,
		comments: temp,
		pending_rewards: temp,
		paid_rewards: temp,
		reblogs: temp,
		communities: temp,
		delete_comments: temp,
		reputations: temp,
	}
	for (let i = 0; i < result.rows.length; i++) {
		const tableName = result.rows[i].table_name
		const lastNum = result.rows[i].last_block_num
		// Green if behind by 2 blocks
		if (headNum - lastNum < 3) {
			syncData[tableName] = `${format(lastNum)}/${format(headNum)} 🟢`
		} else {
			syncData[tableName] = lastNum > 0
				? `${format(lastNum)}/${format(headNum)} 🟡`
				: temp
		}
		if (tableName === 'pending_rewards') {
			if (lastNum === 0) {
				syncData[tableName] = 'Waiting for comments to sync ⏳'
			}
		}
	}
	let counter = 0
	for (let i = 0; i < hiveIndexes.length; i++) {
		const exists = await doesIndexExist(hiveIndexes[i].name)
		if (exists) {
			counter++
		}
	}
	syncData.indexes = `${counter}/${hiveIndexes.length}`
	syncData.indexes += counter === hiveIndexes.length ? ` ✅` : ` ⏳`
	print('Sync status:')
	console.table(syncData)
}

const format = (num: number) => {
	return new Intl.NumberFormat().format(num)
}

const createWorker = (path: string) => {
	return new Worker(import.meta.resolve(path), {
		type: 'module',
	})
}

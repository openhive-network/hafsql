import { startAPI } from './api/start_api.ts'
import { print } from './app/helpers/utils/print.ts'
import { sleep } from './app/helpers/utils/sleep.ts'
import { SyncData } from './app/helpers/types.ts'
import {
	createHiveIndexes,
	doesIndexExist,
	hiveIndexes,
} from './app/indexes/hive_indexes.ts'
import { setup } from './app/setup/setup.ts'
import { handleUpgrade } from './upgrade.ts'
import { purgeHafSQL } from './purge.ts'
import { query } from './app/helpers/database.ts'
import { createWorkers } from './app/helpers/createWorkers.ts'
import { setupPublicUser } from './app/setup/setup_public_user.ts'

// Running hafsql with the argument `purge` will remove everything and exit
if (Deno.args.includes('purge')) {
	print('Running HafSQL with the `purge` command...')
	await purgeHafSQL()
	Deno.exit()
}

// Development argument for api only
if (Deno.args.includes('api_only')) {
	print('Running HafSQL with the `api_only` command...')
	await startAPI()
	// wait here 270 hours - should be enough for development
	await sleep(1000000000)
}

// Just because
console.log(`

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

`)

// Start workers for each indexer
const mainLoop = async () => {
	await createWorkers()
}

let once = false

// We will wait for HAF to be ready before starting
const entryPoint = async () => {
	const result = await query<{ is_ready: boolean }>(
		'SELECT hive.is_instance_ready() AS is_ready;',
	)
	if (result.rows[0]?.is_ready) {
		// Setup database - create views and tables
		await setup()
		// check for possible upgrade actions
		await handleUpgrade()
		startAPI()
		print('[Main] Start creating indexes... ⏳')
		createHiveIndexes()
		setInterval(mainLoop, 5000)
		setTimeout(printStats, 60000)
		setInterval(printStats, 600000)
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

let allReady = false

// Log status of the sync every 10min
const printStats = async () => {
	const head = await query<{ num: number }>(
		`SELECT num FROM hafd.blocks ORDER BY num DESC LIMIT 1;`,
	)
	const headNum = head.rows[0].num
	const result = await query<SyncData>(
		`SELECT * FROM hafsql.sync_data;`,
	)
	const temp = 'Waiting for operations & indexes ⏳'
	const syncData: Record<string, string> = {}
	allReady = true
	for (let i = 0; i < result.rows.length; i++) {
		const tableName = result.rows[i].table_name
		const lastNum = result.rows[i].last_block_num
		// Green if behind by 2 blocks
		if (headNum - lastNum < 3) {
			syncData[tableName] = `${format(lastNum)}/${format(headNum)} 🟢`
		} else {
			allReady = false
			syncData[tableName] = lastNum > 0
				? `${format(lastNum)}/${format(headNum)} 🟡`
				: temp
		}
		if (tableName === 'pending_rewards') {
			if (lastNum === 0) {
				syncData[tableName] = 'Waiting for comments ⏳'
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
	print(`[Main] Sync status: ${allReady ? 'live 🟢' : 'in progress ⏳'}`)
	console.table(syncData)
}
const format = (num: number) => {
	return new Intl.NumberFormat().format(num)
}

// Wait for hafsql to be ready before setting up hafsql_public user
if (Deno.env.get('HAFSQL_PUBLICUSER') === 'true') {
	const publicUserInterval = setInterval(async () => {
		try {
			const isHafReady = await query<{ is_ready: boolean }>(
				'SELECT hive.is_instance_ready() AS is_ready;',
			)
			if (!isHafReady.rows[0]?.is_ready) {
				return
			}
			const head = await query<{ num: number }>(
				`SELECT num FROM hafd.blocks ORDER BY num DESC LIMIT 1;`,
			)
			const headNum = head.rows[0].num
			const result = await query<{ not_synced_yet: number }>(
				`SELECT COUNT(1) AS not_synced_yet FROM hafsql.sync_data WHERE last_block_num < $1`,
				[headNum - 3],
			)
			if (result.rows[0].not_synced_yet > 0) {
				return
			}
			clearInterval(publicUserInterval)
			await setupPublicUser()
		} catch (_e) {
			// In some rare cases can run before tables are created
		}
	}, 10000)
}

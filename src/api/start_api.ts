import {
	Application,
	isHttpError,
	oakCors,
	Router,
	STATUS_TEXT,
} from '../deps.ts'
import { print } from '../app/helpers/utils/print.ts'
import { apiRouter } from './mod.ts'
import { query } from '../app/helpers/database.ts'

let HAF_STATUS = 'unkown'

export const startAPI = async () => {
	if (!Deno.args.includes('api_only')) {
		await checkHafStatus()
	} else {
		// mark haf ready when in development
		HAF_STATUS = 'ready'
	}
	const app = new Application()
	app.use(async (ctx, next) => {
		try {
			// Check if HAF and HafSQL are ready
			if (HAF_STATUS !== 'ready') {
				ctx.response.status = 503
				ctx.response.body = {
					status: 503,
					error: STATUS_TEXT[503],
					message: HAF_STATUS,
				}
				return
			}
			await next()
		} catch (err) {
			if (isHttpError(err)) {
				ctx.response.status = err.status
				ctx.response.body = {
					status: err.status,
					error: STATUS_TEXT[err.status],
					message: err.message,
				}
			} else {
				if (
					err instanceof Error && err &&
					err.message === 'canceling statement due to statement timeout'
				) {
					ctx.response.status = 500
					ctx.response.body = {
						status: 500,
						error: STATUS_TEXT[500],
						message: err.message,
					}
					return
				}
				throw err
			}
		}
	})

	const router = new Router()
		.use(apiRouter.routes())

	// app.addEventListener('error', (e) => {
	// console.log(e.error)
	// })

	app.use(oakCors())
	app.use(router.routes())

	// Handle unhandled responses by the routes
	app.use((ctx, next) => {
		const status = ctx.response.status
		if (status === 404) {
			// route not implemented
			ctx.response.body = {
				status,
				error: STATUS_TEXT[status],
				message: 'Method/Route not implemented',
			}
		}
		next()
	})

	app.listen({ port: 3000 })
	print('[API] API started on port 3000')
}

const checkHafStatus = async () => {
	const isHafReady = await query<{ is_ready: boolean }>(
		'SELECT hive.is_instance_ready() AS is_ready;',
	)
	if (!isHafReady.rows[0]?.is_ready) {
		HAF_STATUS = 'Waiting for HAF to be ready'
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
		HAF_STATUS = 'Waiting for HafSQL to be ready'
		return
	}
	HAF_STATUS = 'ready'
	clearInterval(statusInterval)
}

let statusInterval: number
if (!Deno.args.includes('api_only')) {
	statusInterval = setInterval(checkHafStatus, 5_000)
}

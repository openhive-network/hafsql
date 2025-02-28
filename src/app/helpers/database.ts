import { Pool, QueryResultRow } from '../../deps.ts'

// Lazy loaded per worker
const POOL_SIZE = Number(Deno.env.get('HAFSQL_PGPOOLSIZE')) || 5
const PG_HOST = Deno.env.get('HAFSQL_PGHOST') || '172.17.0.2'
const PG_PORT = Number(Deno.env.get('HAFSQL_PGPORT')) || 5432
const PG_DATABASE = Deno.env.get('HAFSQL_PGDATABASE') || 'haf_block_log'
const PG_USER = Deno.env.get('HAFSQL_PGUSER') || 'haf_admin'

const pool = new Pool(
	{
		host: PG_HOST,
		port: PG_PORT,
		database: PG_DATABASE,
		user: PG_USER,
		password: PG_USER === 'hafsql_public' ? PG_USER : undefined,
		application_name: 'hafsql',
		max: POOL_SIZE,
		idle_in_transaction_session_timeout: 600000,
	},
)

/** Handles queries also with tagged template literals
 * @example
 * query`SELECT ${test}`
 * query('SELECT 1')
 */
export const query = <T extends QueryResultRow>(
	strings: TemplateStringsArray | string,
	...values: any[]
) => {
	const { queryString, params } = parseTemplateLiteralText(strings, values)
	return pool.query<T>(queryString, params)
}

export const queryArray = (
	strings: TemplateStringsArray | string,
	...values: any[]
) => {
	const { queryString, params } = parseTemplateLiteralText(strings, values)
	return pool.query(
		{ text: queryString, values: params, rowMode: 'array' },
	)
}

/** Used by the APIs - has statement_timeout */
export const queryAPI = async <T extends QueryResultRow>(
	strings: TemplateStringsArray | string,
	...values: any[]
) => {
	const { queryString, params } = parseTemplateLiteralText(strings, values)
	const connection = await pool.connect()
	try {
		// 30s
		await connection.query('SET statement_timeout=30000')
		const result = await connection.query<T>(queryString, params)
		await connection.query('SET statement_timeout=0')
		return result
	} finally {
		connection.release()
	}
}

/** Used by the APIs - has statement_timeout */
export const queryArrayAPI = async (
	strings: TemplateStringsArray | string,
	...values: any[]
) => {
	const { queryString, params } = parseTemplateLiteralText(strings, values)
	const connection = await pool.connect()
	try {
		// 30s
		await connection.query('SET statement_timeout=30000')
		const result = await connection.query({
			text: queryString,
			values: params,
			rowMode: 'array',
		})
		await connection.query('SET statement_timeout=0')
		return result
	} finally {
		connection.release()
	}
}

export type customClient = {
	query: typeof query
}

/**
 * Handles transaction begin, commit, and rollback
 * @param callback - function to run
 */
export const transaction = async (
	callback: (client: customClient) => void | Promise<void>,
) => {
	const client = await pool.connect()
	await client.query('BEGIN')
	try {
		const query = async <T extends QueryResultRow>(
			strings: TemplateStringsArray | string,
			...values: any[]
		) => {
			const { queryString, params } = parseTemplateLiteralText(
				strings,
				values,
			)
			const result = await client.query<T>(queryString, params)
			return result
		}
		await callback({ query })
		await client.query('COMMIT')
	} catch (e) {
		await client.query('ROLLBACK')
		throw e
	} finally {
		client.release()
	}
}

const parseTemplateLiteralText = (
	str: TemplateStringsArray | string,
	values: any[],
) => {
	let queryString = ''
	let params = []
	if (typeof str === 'string') {
		queryString = str
		params = values[0]
	} else {
		params = values
		for (let i = 0; i < str.length; i++) {
			queryString += str[i]
			if (i !== str.length - 1) {
				queryString += `$${i + 1}`
			}
		}
	}
	return { queryString, params }
}

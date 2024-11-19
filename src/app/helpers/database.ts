import { Pool } from '../../deps.ts'

// Lazy loaded per worker
const POOL_SIZE = Number(Deno.env.get('HAFSQL_PGPOOLSIZE')) || 5
const PG_HOST = Deno.env.get('HAFSQL_PGHOST') || '172.17.0.2'
const PG_PORT = Number(Deno.env.get('HAFSQL_PGPORT')) || 5432
const PG_DATABASE = Deno.env.get('HAFSQL_PGDATABASE') || 'haf_block_log'
const PG_USER = Deno.env.get('HAFSQL_PGUSER') || 'haf_admin'

export const pool = new Pool(
	{
		hostname: PG_HOST,
		port: PG_PORT,
		database: PG_DATABASE,
		user: PG_USER,
		applicationName: 'hafsql',
	},
	POOL_SIZE,
	true,
)

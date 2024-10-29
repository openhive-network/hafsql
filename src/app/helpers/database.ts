import { Pool } from '../../deps.ts'

// Per worker
// We have 8 workers = 2 * 8 = 16 connections
// Recommended 2
const POOL_SIZE = Number(Deno.env.get('HAFSQL_PGPOOLSIZE')) || 3

export const pool = new Pool(
	{
		hostname: '172.17.0.2',
		port: 5432,
		database: 'haf_block_log',
		user: 'haf_admin',
		applicationName: 'hafsql',
	},
	POOL_SIZE,
	true,
)

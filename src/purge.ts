import { print } from './app/helpers/utils/print.ts'
import { hiveIndexes } from './app/indexes/hive_indexes.ts'
import { Client } from './deps.ts'

const PG_HOST = Deno.env.get('HAFSQL_PGHOST') || '172.17.0.2'
const PG_PORT = Number(Deno.env.get('HAFSQL_PGPORT')) || 5432
const PG_DATABASE = Deno.env.get('HAFSQL_PGDATABASE') || 'haf_block_log'
const PG_USER = Deno.env.get('HAFSQL_PGUSER') || 'haf_admin'

/**
 * Remove hafsql schema and everything related
 */
export const purgeHafSQL = async () => {
	const client = new Client(
		{
			host: PG_HOST,
			port: PG_PORT,
			database: PG_DATABASE,
			user: PG_USER,
			application_name: 'hafsql',
		},
	)
	await client.connect()
	print('Removing hafsql schema...')
	await client.query('DROP SCHEMA IF EXISTS hafsql CASCADE;')
	print('Removing indexes...')
	for (let i = 0; i < hiveIndexes.length; i++) {
		await client.query(
			`DROP INDEX CONCURRENTLY IF EXISTS hafd.${hiveIndexes[i].name}`,
		)
	}
	// Remove the hivemind index
	try {
		await client.query(
			`DROP INDEX CONCURRENTLY IF EXISTS hivemind_app.hafsql_last_update_rshares_idx`,
		)
		await client.query(
			`DROP INDEX CONCURRENTLY IF EXISTS hivemind_app.hafsql_last_update_vote_percent_idx`,
		)
	} catch {
		//
	}
	try {
		await client.query('DROP OWNED BY hafsql_public CASCADE')
	} catch (_e) {
		//
	}
	try {
		await client.query('DROP OWNED BY hafsql_owner CASCADE')
	} catch (_e) {
		//
	}
	try {
		await client.query('DROP OWNED BY hafsql_user CASCADE')
	} catch (_e) {
		//
	}
	await client.query('DROP ROLE IF EXISTS hafsql_public')
	await client.query('DROP ROLE IF EXISTS hafsql_owner')
	await client.query('DROP ROLE IF EXISTS hafsql_user')
	print('Purge done.')
}

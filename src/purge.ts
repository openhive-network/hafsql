import { query } from './app/helpers/database.ts'
import { print } from './app/helpers/utils/print.ts'
import { hiveIndexes } from './app/indexes/hive.ts'

/**
 * Remove hafsql schema and everything related
 */
export const purgeHafSQL = async () => {
	print('Removing hafsql schema...')
	await query('DROP SCHEMA IF EXISTS hafsql CASCADE;')
	print('Removing indexes...')
	for (let i = 0; i < hiveIndexes.length; i++) {
		await query(
			`DROP INDEX CONCURRENTLY IF EXISTS ${hiveIndexes[i].name}`,
		)
	}
	try {
		await query('DROP OWNED BY hafsql_public CASCADE')
	} catch (_e) {
		//
	}
	await query('DROP ROLE IF EXISTS hafsql_public')
	print('Purge done.')
}

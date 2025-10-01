import deno from '../deno.json' with { type: 'json' }
import { query, transaction } from './app/helpers/database.ts'
import { print } from './app/helpers/utils/print.ts'
import { operationTables } from './app/setup/setup_operation_tables.ts'
import { semver } from './deps.ts'
import { setup } from './app/setup/setup.ts'

/**
 * Make upgrade decisions based on the version - this runs just after the setup
 */
export const handleUpgrade = async () => {
	const getVersion = await query<{ version: string }>(
		'SELECT version FROM hafsql.version WHERE name=$1',
		['hafsql'],
	)
	if (getVersion.rows.length === 0) {
		// not an upgrade
		await query(
			'INSERT INTO hafsql.version (name, version) VALUES ($1, $2)',
			['hafsql', deno.version],
		)
		return
	}

	const oldVersion = getVersion.rows[0].version
	const newVersion = deno.version

	// Upgrading from <= 2.3.1
	// Need to resync operations and accounts table
	if (semver.lessOrEqual(semver.parse(oldVersion), semver.parse('2.3.1'))) {
		print(
			'Upgrading from version <= 2.3.1 - need to resync accounts & operations',
		)
		await transaction(async (client) => {
			for (const [name, _value] of Object.entries(operationTables)) {
				// The tables should exists because setup already ran
				await client.query(`DROP TABLE hafsql.operation_${name}_table CASCADE;`)
			}
			await client.query(`DROP TABLE hafsql.accounts_table CASCADE;`)
			await client.query(
				`UPDATE hafsql.sync_data SET last_block_num=0 WHERE table_name IN ('accounts', 'operations')`,
			)
		})
		print('Upgrade script done ✅')
		// Run setup again to recreate the tables
		await setup()
	}

	// Update the version
	if (oldVersion !== newVersion) {
		await query(
			'UPDATE hafsql.version SET version=$1 WHERE name=$2',
			[newVersion, 'hafsql'],
		)
	}
}

import deno from '../deno.json' with { type: 'json' }
import { pool } from './app/helpers/database.ts'

/**
 * Make upgrade decisions based on the version
 */
export const handleUpgrade = async () => {
	const client = await pool.connect()
	const getVersion = await client.queryObject<{ version: string }>(
		'SELECT version FROM hafsql.version WHERE name=$1',
		['hafsql'],
	)
	if (getVersion.rows.length === 0) {
		// not an upgrade
		await client.queryObject(
			'INSERT INTO hafsql.version (name, version) VALUES ($1, $2)',
			['hafsql', deno.version],
		)
		return
	}

	const oldVersion = getVersion.rows[0].version
	const newVersion = deno.version
	// perhaps use transaction
	// if (oldVersion === '') {
	// do something
	// }
	if (oldVersion !== newVersion) {
		await client.queryObject(
			'UPDATE hafsql.version SET version=$1 WHERE name=$2',
			[newVersion, 'hafsql'],
		)
	}
	client.release()
}

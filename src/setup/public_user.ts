import { pool } from '../helpers/database.ts'

export const setupPublicUser = async () => {
	const client = await pool.connect()

	const role = await client.queryObject(
		'SELECT rolname FROM pg_catalog.pg_roles WHERE rolname = $1',
		['hafsql_public'],
	)
	if (role.rowCount === 0) {
		await client.queryObject(
			"CREATE ROLE hafsql_public NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'hafsql_public';",
		)
	}
	await client.queryObject('GRANT USAGE ON SCHEMA hafsql TO hafsql_public;')
	await client.queryObject(
		'GRANT SELECT ON ALL TABLES IN SCHEMA hafsql TO hafsql_public;',
	)
	await client.queryObject(
		'GRANT ALL ON FUNCTION hive._operation_to_jsonb TO hafsql_public;',
	)
	await client.queryObject(
		'GRANT ALL ON FUNCTION hive.operation_id_to_block_num TO hafsql_public;',
	)
	await client.queryObject(
		'GRANT ALL ON FUNCTION hive.operation_id_to_type_id TO hafsql_public;',
	)
	await client.queryObject(
		"ALTER USER hafsql_public SET statement_timeout='45s';",
	)
	await client.queryObject(
		'ALTER USER hafsql_public SET search_path TO hafsql, public;',
	)
	console.log('hafsql_public user setup done')
}

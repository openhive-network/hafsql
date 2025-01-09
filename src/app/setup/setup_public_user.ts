import { query } from '../helpers/database.ts'
import { print } from '../helpers/utils/print.ts'

export const setupPublicUser = async () => {
	const role = await query(
		'SELECT rolname FROM pg_catalog.pg_roles WHERE rolname = $1',
		['hafsql_public'],
	)
	if (role.rowCount === 0) {
		await query(
			"CREATE ROLE hafsql_public NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'hafsql_public';",
		)
	}
	await query('GRANT USAGE ON SCHEMA hafsql TO hafsql_public;')
	await query('GRANT USAGE ON SCHEMA hafd TO hafsql_public;')
	await query(
		'GRANT SELECT ON ALL TABLES IN SCHEMA hafsql TO hafsql_public;',
	)
	await query(
		'GRANT ALL ON FUNCTION hafd._operation_to_jsonb TO hafsql_public;',
	)
	await query(
		'GRANT ALL ON FUNCTION hafd.operation_id_to_block_num TO hafsql_public;',
	)
	await query(
		'GRANT ALL ON FUNCTION hafd.operation_id_to_type_id TO hafsql_public;',
	)
	await query(
		'GRANT ALL ON FUNCTION hafd.operation_id_to_pos TO hafsql_public;',
	)
	await query(
		"ALTER USER hafsql_public SET statement_timeout='45s';",
	)
	await query(
		'ALTER USER hafsql_public SET search_path TO hafsql, public;',
	)
	print('[Main] hafsql_public user setup done')
}

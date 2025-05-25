import { query } from '../helpers/database.ts'
import { print } from '../helpers/utils/print.ts'

let checkInterval: number

export const setupPublicUser = async () => {
	const role = await query(
		'SELECT rolname FROM pg_catalog.pg_roles WHERE rolname = $1',
		['hafsql_public'],
	)
	if (role.rowCount) {
		await query('DROP OWNED BY hafsql_public CASCADE;')
		await query('DROP USER hafsql_public;')
	}
	await query(
		"CREATE ROLE hafsql_public NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'hafsql_public';",
	)
	await grantUsageOnSchema('hafsql')
	await grantUsageOnSchema('hafd')
	await grantUsageOnSchema('hive')
	await grantUsageOnSchema('hafbe_app')
	await grantUsageOnSchema('hafbe_backend')
	await grantUsageOnSchema('hafbe_views')
	await grantUsageOnSchema('hafbe_bal')
	await grantUsageOnSchema('hivemind_app')
	await grantUsageOnSchema('reptracker_app')
	await grantUsageOnSchema('btracker_endpoints')
	await grantUsageOnSchema('hafah_endpoints')
	await grantUsageOnSchema('hafbe_endpoints')
	await grantUsageOnSchema('hivemind_endpoints')
	await grantUsageOnSchema('reptracker_endpoints')
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
		'GRANT ALL ON FUNCTION hafd.operation_from_jsontext TO hafsql_public;',
	)
	await query(
		'GRANT ALL ON FUNCTION hive.get_legacy_style_operation TO hafsql_public;',
	)
	await query(
		"ALTER USER hafsql_public SET statement_timeout='45s';",
	)
	await query(
		'ALTER USER hafsql_public SET search_path TO hafsql, public;',
	)
	// HAF tables/views
	await grantSelectToSchema('hive', 'views')
	await grantSelectToSchema('hafd', 'tables')
	// Hafbe
	await grantSelectToSchema('hafbe_app', 'tables')
	await grantSelectToSchema('hafbe_backend', 'views')
	await grantSelectToSchema('hafbe_views', 'views')
	// balance tracker
	await grantSelectToSchema('hafbe_bal', 'tables')
	// hivemind
	await grantSelectToSchema('hivemind_app', 'tables')
	// reptracker
	await grantSelectToSchema('reptracker_app', 'tables')

	// Grant usage on endpoint functions which are used by json/rest apis
	await grantUsageToFunctions('btracker_endpoints')
	await grantUsageToFunctions('hafah_endpoints')
	await grantUsageToFunctions('hafbe_endpoints')
	await grantUsageToFunctions('hivemind_endpoints')
	await grantUsageToFunctions('reptracker_endpoints')

	print('[Main] hafsql_public user setup done')

	if (!checkInterval) {
		checkInterval = setInterval(() => {
			// interval to check if the public_user is accessible
			// This is an insanely rare issue that happens usually after weeks of being online
			// Sometimes public_user becomes non-authenticable
			// Not sure yet how to detect this
			// TODO - above
		}, 5_000)
	}
}

const grantSelectToSchema = async (
	schema: string,
	onWhat: 'tables' | 'views',
) => {
	await query(
		`DO $$
		DECLARE
			r RECORD;
		BEGIN
			FOR r IN
				SELECT table_schema, table_name
				FROM information_schema.${onWhat}
				WHERE table_schema = '${schema}'
			LOOP
				EXECUTE format('GRANT SELECT ON %I.%I TO hafsql_public', r.table_schema, r.table_name);
			END LOOP;
		END
		$$;`,
	)
}

const grantUsageToFunctions = async (schema: string) => {
	await query(
		`DO $$
		DECLARE
			r RECORD;
		BEGIN
			FOR r IN
				SELECT n.nspname AS schema_name,
					p.proname AS function_name,
					pg_get_function_identity_arguments(p.oid) AS args
				FROM pg_proc p
				JOIN pg_namespace n ON n.oid = p.pronamespace
				WHERE n.nspname = '${schema}'
			LOOP
				EXECUTE format('GRANT ALL ON FUNCTION %I.%I(%s) TO hafsql_public',
					r.schema_name, r.function_name, r.args);
			END LOOP;
		END
		$$;`,
	)
}

const grantUsageOnSchema = async (schema: string) => {
	await query(`GRANT USAGE ON SCHEMA ${schema} TO hafsql_public;`)
}

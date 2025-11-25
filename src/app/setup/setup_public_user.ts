import { query } from '../helpers/database.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'

let checkInterval: number

const username = Deno.env.get('HAFSQL_PUBLICUSERNAME') || 'hafsql_public'
const password = Deno.env.get('HAFSQL_PUBLICPASSWORD') || 'hafsql_public'

export const setupPublicUser = async () => {
	try {
		const role = await query(
			'SELECT rolname FROM pg_catalog.pg_roles WHERE rolname = $1',
			[username],
		)
		if (role?.rowCount && role.rowCount < 1) {
			// await query(`DROP OWNED BY ${username} CASCADE;`)
			// await query(`DROP USER ${username};`)
			await query(
				`CREATE ROLE ${username} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD '${password}';`,
			)
		}
		await grantUsageOnSchema('hafsql')
		await grantUsageOnSchema('hafd')
		await grantUsageOnSchema('hive')
		await grantUsageOnSchema('hafbe_app')
		await grantUsageOnSchema('hafbe_backend')
		// await grantUsageOnSchema('hafbe_views')
		await grantUsageOnSchema('hafbe_bal')
		await grantUsageOnSchema('hivemind_app')
		await grantUsageOnSchema('reptracker_app')
		await grantUsageOnSchema('btracker_endpoints')
		await grantUsageOnSchema('hafah_endpoints')
		await grantUsageOnSchema('hafbe_endpoints')
		await grantUsageOnSchema('hivemind_endpoints')
		await grantUsageOnSchema('reptracker_endpoints')
		await query(
			`GRANT SELECT ON ALL TABLES IN SCHEMA hafsql TO ${username};`,
		)
		await query(
			`GRANT ALL ON FUNCTION hafd._operation_to_jsonb TO ${username};`,
		)
		await query(
			`GRANT ALL ON FUNCTION hafd.operation_id_to_block_num TO ${username};`,
		)
		await query(
			`GRANT ALL ON FUNCTION hafd.operation_id_to_type_id TO ${username};`,
		)
		await query(
			`GRANT ALL ON FUNCTION hafd.operation_id_to_pos TO ${username};`,
		)
		await query(
			`GRANT ALL ON FUNCTION hafd.operation_from_jsontext TO ${username};`,
		)
		await query(
			`GRANT ALL ON FUNCTION hive.get_legacy_style_operation TO ${username};`,
		)
		await query(
			`ALTER USER ${username} SET statement_timeout='45s';`,
		)
		await query(
			`ALTER USER ${username} SET search_path TO hafsql, public;`,
		)
		// HAF tables/views
		await grantSelectToSchema('hive', 'views')
		await grantSelectToSchema('hafd', 'tables')
		// Hafbe
		await grantSelectToSchema('hafbe_app', 'tables')
		await grantSelectToSchema('hafbe_backend', 'views')
		// await grantSelectToSchema('hafbe_views', 'views')
		// balance tracker
		await grantSelectToSchema('hafbe_bal', 'tables')
		// hivemind
		await grantSelectToSchema('hivemind_app', 'tables')
		await grantSelectToSchema('hivemind_app', 'views')
		// reptracker
		await grantSelectToSchema('reptracker_app', 'tables')

		// Grant usage on endpoint functions which are used by json/rest apis
		await grantUsageToFunctions('btracker_endpoints')
		await grantUsageToFunctions('hafah_endpoints')
		await grantUsageToFunctions('hafbe_endpoints')
		await grantUsageToFunctions('hivemind_endpoints')
		await grantUsageToFunctions('reptracker_endpoints')

		print(`[Main] ${username} user setup done!`)
	} catch (e) {
		console.log('Error setting up public user, trying again.', e)
		await sleep(3000)
		setupPublicUser()
	}
}

const grantSelectToSchema = async (
	schema: string,
	onWhat: 'tables' | 'views',
) => {
	try {
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
				EXECUTE format('GRANT SELECT ON %I.%I TO ${username}', r.table_schema, r.table_name);
			END LOOP;
		END
		$$;`,
		)
	} catch {
		// This can fail if other apps are not synced yet
	}
}

const grantUsageToFunctions = async (schema: string) => {
	try {
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
				EXECUTE format('GRANT ALL ON FUNCTION %I.%I(%s) TO ${username}',
					r.schema_name, r.function_name, r.args);
			END LOOP;
		END
		$$;`,
		)
	} catch {
		// This can fail if other apps are not synced yet
	}
}

const grantUsageOnSchema = async (schema: string) => {
	try {
		await query(`GRANT USAGE ON SCHEMA ${schema} TO ${username};`)
	} catch (e) {
		console.log(e)
		// This can fail if other apps are not synced yet
	}
}

import { query } from '../helpers/database.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'

const username = Deno.env.get('HAFSQL_PUBLICUSERNAME') || 'hafsql_public'
const password = Deno.env.get('HAFSQL_PUBLICPASSWORD') || 'hafsql_public'
const statementTimeout = Deno.env.get('HAFSQL_PUBLIC_STATEMENT_TIMEOUT') || '15s'
const workMem = Deno.env.get('HAFSQL_PUBLIC_WORK_MEM')
const tempFileLimit = Deno.env.get('HAFSQL_PUBLIC_TEMP_FILE_LIMIT')

export const setupPublicUser = async () => {
	try {
		try {
			await query(
				`CREATE ROLE ${username} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD '${password}';`,
			)
		} catch {
			//
		}
		await grantSchemaAccess(username)
		await query(
			`ALTER USER ${username} SET statement_timeout='${statementTimeout}';`,
		)
		if (workMem) {
			await query(
				`ALTER USER ${username} SET work_mem='${workMem}';`,
			)
		}
		if (tempFileLimit) {
			await query(
				`ALTER USER ${username} SET temp_file_limit='${tempFileLimit}';`,
			)
		}
		await query(
			`ALTER USER ${username} SET search_path TO hafsql, public;`,
		)

		print(`[Main] ${username} user setup done!`)
	} catch (e) {
		console.log('Error setting up public user, trying again.', e)
		await sleep(3000)
		setupPublicUser()
	}
}

export const setupApiUser = async () => {
	try {
		await query(
			`ALTER ROLE hafsql_user NOSUPERUSER NOCREATEDB;`,
		)
		await grantSchemaAccess('hafsql_user')
		await query(
			`ALTER USER hafsql_user SET search_path TO hafsql, public;`,
		)
		print(`[Main] hafsql_user grants setup done!`)
	} catch (e) {
		console.log('Error setting up API user, trying again.', e)
		await sleep(3000)
		setupApiUser()
	}
}

const grantSchemaAccess = async (forUser: string) => {
	await grantUsageOnSchema('hafsql', forUser)
	await grantUsageOnSchema('hafd', forUser)
	await grantUsageOnSchema('hive', forUser)
	await grantUsageOnSchema('hafbe_app', forUser)
	await grantUsageOnSchema('hafbe_backend', forUser)
	// await grantUsageOnSchema('hafbe_views', forUser)
	await grantUsageOnSchema('hafbe_bal', forUser)
	await grantUsageOnSchema('hivemind_app', forUser)
	await grantUsageOnSchema('reptracker_app', forUser)
	await grantUsageOnSchema('btracker_endpoints', forUser)
	await grantUsageOnSchema('hafah_endpoints', forUser)
	await grantUsageOnSchema('hafbe_endpoints', forUser)
	await grantUsageOnSchema('hivemind_endpoints', forUser)
	await grantUsageOnSchema('reptracker_endpoints', forUser)
	await query(
		`GRANT SELECT ON ALL TABLES IN SCHEMA hafsql TO ${forUser};`,
	)
	await query(
		`GRANT EXECUTE ON FUNCTION hafd._operation_to_jsonb TO ${forUser};`,
	)
	await query(
		`GRANT EXECUTE ON FUNCTION hafd.operation_id_to_block_num TO ${forUser};`,
	)
	await query(
		`GRANT EXECUTE ON FUNCTION hafd.operation_id_to_type_id TO ${forUser};`,
	)
	await query(
		`GRANT EXECUTE ON FUNCTION hafd.operation_id_to_pos TO ${forUser};`,
	)
	await query(
		`GRANT EXECUTE ON FUNCTION hafd.operation_from_jsontext TO ${forUser};`,
	)
	await query(
		`GRANT EXECUTE ON FUNCTION hive.get_legacy_style_operation TO ${forUser};`,
	)
	// HAF tables/views
	await grantSelectToSchema('hive', 'views', forUser)
	await grantSelectToSchema('hafd', 'tables', forUser)
	// Hafbe
	await grantSelectToSchema('hafbe_app', 'tables', forUser)
	await grantSelectToSchema('hafbe_backend', 'views', forUser)
	// await grantSelectToSchema('hafbe_views', 'views', forUser)
	// balance tracker
	await grantSelectToSchema('hafbe_bal', 'tables', forUser)
	// hivemind
	await grantSelectToSchema('hivemind_app', 'tables', forUser)
	await grantSelectToSchema('hivemind_app', 'views', forUser)
	// reptracker
	await grantSelectToSchema('reptracker_app', 'tables', forUser)

	// Grant usage on endpoint functions which are used by json/rest apis
	await grantUsageToFunctions('btracker_endpoints', forUser)
	await grantUsageToFunctions('hafah_endpoints', forUser)
	await grantUsageToFunctions('hafbe_endpoints', forUser)
	await grantUsageToFunctions('hivemind_endpoints', forUser)
	await grantUsageToFunctions('reptracker_endpoints', forUser)
}

const grantSelectToSchema = async (
	schema: string,
	onWhat: 'tables' | 'views',
	forUser: string,
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
				EXECUTE format('GRANT SELECT ON %I.%I TO ${forUser}', r.table_schema, r.table_name);
			END LOOP;
		END
		$$;`,
		)
	} catch {
		// This can fail if other apps are not synced yet
	}
}

const grantUsageToFunctions = async (schema: string, forUser: string) => {
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
				EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO ${forUser}',
					r.schema_name, r.function_name, r.args);
			END LOOP;
		END
		$$;`,
		)
	} catch {
		// This can fail if other apps are not synced yet
	}
}

const grantUsageOnSchema = async (schema: string, forUser: string) => {
	try {
		await query(`GRANT USAGE ON SCHEMA ${schema} TO ${forUser};`)
	} catch (e) {
		console.log(e)
		// This can fail if other apps are not synced yet
	}
}

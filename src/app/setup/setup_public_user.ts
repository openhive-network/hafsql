import { query } from '../helpers/database.ts'
import { print } from '../helpers/utils/print.ts'
import { sleep } from '../helpers/utils/sleep.ts'

const username = Deno.env.get('HAFSQL_PUBLICUSERNAME') || 'hafsql_public'
const password = Deno.env.get('HAFSQL_PUBLICPASSWORD') || 'hafsql_public'
const statementTimeout = Deno.env.get('HAFSQL_PUBLIC_STATEMENT_TIMEOUT') ||
	'45s'
const workMem = Deno.env.get('HAFSQL_PUBLIC_WORK_MEM')
const tempFileLimit = Deno.env.get('HAFSQL_PUBLIC_TEMP_FILE_LIMIT') || '512MB'

const identifier = (value: string) => {
	if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
		throw new Error(`Invalid PostgreSQL identifier: ${value}`)
	}
	return `"${value}"`
}

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`
const publicRole = identifier(username)

export const setupPublicUser = async () => {
	try {
		try {
			await query(
				`CREATE ROLE ${publicRole} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD ${
					literal(password)
				};`,
			)
		} catch {
			//
		}
		await grantSchemaAccess(username)
		await applyPublicSecurityHardening()
		await query(
			`ALTER USER ${publicRole} SET statement_timeout=${
				literal(statementTimeout)
			};`,
		)
		// Users can raise statement_timeout with SET LOCAL and PgBouncer's query_timeout
		// only drops the client - the query keeps running. Terminate them server-side.
		// A bare number is milliseconds for statement_timeout but seconds for interval
		const timeoutInterval = /^\d+$/.test(statementTimeout)
			? `${statementTimeout}ms`
			: statementTimeout
		await query(
			`SELECT cron.schedule('hafsql-public-query-timeout', '10 seconds', $1)`,
			[
				`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
				WHERE usename = ${literal(username)} AND state = 'active'
				AND now() - query_start > ${
					literal(timeoutInterval)
				}::interval + interval '5 seconds'`,
			],
		)
		if (workMem) {
			await query(
				`ALTER USER ${publicRole} SET work_mem=${literal(workMem)};`,
			)
		}
		await query(
			`ALTER USER ${publicRole} SET temp_file_limit=${literal(tempFileLimit)};`,
		)
		await query(
			`ALTER USER ${publicRole} SET search_path TO hafsql, public;`,
		)

		print(`[Main] ${username} user setup done!`)
	} catch (e) {
		console.log('Error setting up public user, trying again.', e)
		await sleep(3000)
		setupPublicUser()
	}
}

/**
 * Remove inherited privileges that allow fast, persistent side effects which
 * PgBouncer timeouts cannot prevent. Existing non-public roles receive an
 * explicit equivalent grant first, so installed HAF applications keep their
 * current effective access. The block is atomic and safe to run repeatedly.
 */
const applyPublicSecurityHardening = async () => {
	await query(
		`DO $security$
		DECLARE
			protected_role record;
			protected_function record;
			public_has_privilege boolean;
		BEGIN
			-- Explicit temporary tables are not covered by temp_file_limit.
			SELECT EXISTS (
				SELECT FROM pg_database d,
				LATERAL aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) acl
				WHERE d.datname = current_database()
					AND acl.grantee = 0
					AND acl.privilege_type = 'TEMPORARY'
			) INTO public_has_privilege;
			IF public_has_privilege THEN
				FOR protected_role IN
					SELECT rolname FROM pg_roles
					WHERE rolname <> ${literal(username)} AND rolname !~ '^pg_'
				LOOP
					EXECUTE format(
						'GRANT TEMPORARY ON DATABASE %I TO %I',
						current_database(), protected_role.rolname);
				END LOOP;
			END IF;
			EXECUTE format(
				'REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC',
				current_database());
			EXECUTE format(
				'REVOKE TEMPORARY ON DATABASE %I FROM %I',
				current_database(), ${literal(username)});

			-- Only haf_admin owns objects in this schema on the production node.
			IF to_regnamespace('paradedb') IS NOT NULL THEN
				REVOKE CREATE ON SCHEMA paradedb FROM PUBLIC;
				EXECUTE format(
					'REVOKE CREATE ON SCHEMA paradedb FROM %I',
					${literal(username)});
			END IF;

			-- Preserve current roles, then remove default/public execution.
			FOR protected_function IN
				SELECT n.nspname AS schema_name,
					p.proname AS function_name,
					pg_get_function_identity_arguments(p.oid) AS arguments,
					EXISTS (
						SELECT FROM aclexplode(
							COALESCE(p.proacl, acldefault('f', p.proowner))) acl
						WHERE acl.grantee = 0
							AND acl.privilege_type = 'EXECUTE'
					) AS public_has_execute
				FROM pg_proc p
				JOIN pg_namespace n ON n.oid = p.pronamespace
				WHERE
					(n.nspname = 'hive' AND p.proname = 'log_context')
					OR (n.nspname = 'pg_catalog' AND (
						p.proname ~ '^pg_(try_)?advisory_(xact_)?lock(_shared)?$'
						OR p.proname IN (
							'pg_cancel_backend', 'pg_terminate_backend',
							'pg_sleep', 'pg_sleep_for', 'pg_sleep_until',
							'pg_notify', 'lo_creat', 'lo_create', 'lo_from_bytea',
							'lo_put', 'lo_unlink', 'lowrite',
							'lo_truncate', 'lo_truncate64'
						)
					))
			LOOP
				IF protected_function.public_has_execute THEN
					FOR protected_role IN
						SELECT rolname FROM pg_roles
						WHERE rolname <> ${literal(username)} AND rolname !~ '^pg_'
					LOOP
						EXECUTE format(
							'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO %I',
							protected_function.schema_name,
							protected_function.function_name,
							protected_function.arguments,
							protected_role.rolname);
					END LOOP;
				END IF;
				EXECUTE format(
					'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
					protected_function.schema_name,
					protected_function.function_name,
					protected_function.arguments);
				EXECUTE format(
					'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM %I',
					protected_function.schema_name,
					protected_function.function_name,
					protected_function.arguments,
					${literal(username)});
			END LOOP;

			IF to_regclass('cron.job_run_details') IS NOT NULL THEN
				SELECT EXISTS (
					SELECT FROM pg_class c,
					LATERAL aclexplode(
						COALESCE(c.relacl, acldefault('r', c.relowner))) acl
					WHERE c.oid = 'cron.job_run_details'::regclass
						AND acl.grantee = 0
						AND acl.privilege_type = 'DELETE'
				) INTO public_has_privilege;
				IF public_has_privilege THEN
					FOR protected_role IN
						SELECT rolname FROM pg_roles
						WHERE rolname <> ${literal(username)} AND rolname !~ '^pg_'
					LOOP
						EXECUTE format(
							'GRANT DELETE ON TABLE cron.job_run_details TO %I',
							protected_role.rolname);
					END LOOP;
				END IF;
				REVOKE DELETE ON TABLE cron.job_run_details FROM PUBLIC;
				EXECUTE format(
					'REVOKE DELETE ON TABLE cron.job_run_details FROM %I',
					${literal(username)});
			END IF;
		END
		$security$;`,
	)
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

const assertEquals = (actual: unknown, expected: unknown) => {
	if (actual !== expected) {
		throw new Error(`Expected ${expected}, got ${actual}`)
	}
}

Deno.test('public user hardening preserves apps before restricting PUBLIC', async () => {
	const source = await Deno.readTextFile(
		new URL('./setup_public_user.ts', import.meta.url),
	)
	const tempGrant = source.indexOf('GRANT TEMPORARY ON DATABASE')
	const tempRevoke = source.indexOf('REVOKE TEMPORARY ON DATABASE')
	assertEquals(tempGrant >= 0, true)
	assertEquals(tempRevoke > tempGrant, true)
	assertEquals(source.includes('REVOKE CREATE ON SCHEMA paradedb'), true)
	assertEquals(source.includes("p.proname = 'log_context'"), true)
	assertEquals(source.includes("'lo_create'"), true)
	assertEquals(source.includes("'pg_cancel_backend'"), true)
	assertEquals(source.includes('cron.job_run_details'), true)
	assertEquals(source.includes('ALTER DEFAULT PRIVILEGES'), false)
})

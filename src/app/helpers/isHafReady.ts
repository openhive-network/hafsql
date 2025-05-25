import { query } from './database.ts'

/** Return true if HAF is at LIVE sync */
export const isHafReady = async () => {
	const isHafReady = await query<{ is_ready: boolean }>(
		'SELECT hive.is_instance_ready() AS is_ready;',
	)
	if (!isHafReady.rows[0]?.is_ready) {
		return false
	}
	// We double check because the above function has a bug as of 1.27.11rc5
	const hafState = await query<{ state: string }>(
		'SELECT state FROM hafd.hive_state WHERE id = 1;',
	)
	if (hafState.rows[0]?.state === 'LIVE') {
		return true
	}
	return false
}

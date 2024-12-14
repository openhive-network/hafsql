import { query } from '../../app/helpers/database.ts'

export const userExists = async (username: string) => {
	const exists = await query<{ exists: boolean }>(
		'SELECT EXISTS (SELECT 1 FROM hafsql.accounts WHERE name=$1) AS exists',
		[username],
	)
	return exists.rows[0].exists
}

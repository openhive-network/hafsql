import { pool } from '../helpers/database.ts'

export const setupSchema = async () => {
	using client = await pool.connect()
	await client.queryObject('CREATE SCHEMA IF NOT EXISTS hafsql;')
}

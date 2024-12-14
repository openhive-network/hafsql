import { query } from '../helpers/database.ts'

export const setupSchema = async () => {
	await query('CREATE SCHEMA IF NOT EXISTS hafsql;')
}

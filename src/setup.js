import { pool } from '../helpers/database.js'
import { setupOperationViews } from './operations.js'

// Creating hafsql schema and all the views
export const setup = async () => {
  const schema = `CREATE SCHEMA IF NOT EXISTS hafsql`
  await pool.query(schema)

  await setupOperationViews()
}

export const createIndexes = async () => {
  // 
}


// index operations id, op_type_id


import { pool } from '../helpers/database.js'
import { removeOperationViews, setupOperationViews } from './operations.js'
import { removeVirtualOperationViews, setupVirtualOperationViews } from './virtualOperations.js'

// Creating hafsql schema and all the views
export const setup = async () => {
  const schema = `CREATE SCHEMA IF NOT EXISTS hafsql;`
  await pool.query(schema)

  console.log('Creating the functions...')
  await setupFunctions()

  console.log('Dropping the views...')
  await removeOperationViews()
  await removeVirtualOperationViews()

  console.log('Recreating the views...')
  await setupOperationViews()
  await setupVirtualOperationViews()
}

export const createIndexes = async () => {
  // 
}

const setupFunctions = async () => {
  const AssetAmount = `CREATE OR REPLACE FUNCTION hafsql_assetamount(text) RETURNS float
    AS $$ SELECT ($1::jsonb->>'amount')::int / power(10, ($1::jsonb->>'precision')::int) $$
    LANGUAGE SQL
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await pool.query(AssetAmount)

  const AssetSymbol = `CREATE OR REPLACE FUNCTION hafsql_assetsymbol(text) RETURNS text
    AS $$ SELECT CASE WHEN $1::jsonb->>'nai' = '@@000000013' THEN 'HBD' WHEN $1::jsonb->>'nai' = '@@000000037' THEN 'VESTS' ELSE 'HIVE' END $$
    LANGUAGE SQL
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await pool.query(AssetSymbol)
}

// index operations id, op_type_id


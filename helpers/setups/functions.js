import { pool } from '../database.js'

export const setupFunctions = async () => {
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

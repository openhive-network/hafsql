import { pool } from '../database.js'

export const setupFunctions = async () => {
  const AssetAmount = `CREATE OR REPLACE FUNCTION hafsql_assetamount(text) RETURNS float
    AS $$ SELECT ($1::jsonb->>'amount')::int8 / power(10, ($1::jsonb->>'precision')::int8) $$
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

  const IsJsonb = `CREATE OR REPLACE FUNCTION hafsql.is_jsonb(_txt text)
      RETURNS bool
      LANGUAGE plpgsql IMMUTABLE STRICT AS
    $func$
    BEGIN
      RETURN _txt::jsonb IS NOT NULL;
    EXCEPTION
      WHEN SQLSTATE '22P02' THEN  -- invalid_text_representation
          RETURN false;
    END
    $func$;`
  await pool.query(IsJsonb)
}

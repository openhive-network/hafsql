import { pool } from '../helpers/database.ts'

export const setupFunctions = async () => {
  // `using` so don't need to release the client
  using client = await pool.connect()

  // Get the asset amount from the asset object
  const assetAmount = `CREATE OR REPLACE FUNCTION hafsql.asset_amount(text)
    RETURNS float
    AS $$
    DECLARE
      amount float;
    BEGIN
      SELECT ($1::jsonb->>'amount')::int8 / power(10, ($1::jsonb->>'precision')::int8) INTO STRICT amount;
      RETURN amount;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await client.queryObject(assetAmount)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.asset_amount (text) IS
    'Return the calculated amount(float) of an asset object like {"nai": "@@000000021", "amount": "2123", "precision": 3}';`)

  // Get the asset symbol from the asset object
  const assetSymbol = `CREATE OR REPLACE FUNCTION hafsql.asset_symbol(text)
    RETURNS text
    AS $$
    DECLARE
      symbol text;
    BEGIN
      SELECT CASE
        WHEN $1::jsonb->>'nai' = '@@000000013' THEN 'HBD'
        WHEN $1::jsonb->>'nai' = '@@000000037' THEN 'VESTS'
        ELSE 'HIVE' END INTO STRICT symbol;
      RETURN symbol;
    EXCEPTION WHEN OTHERS THEN
      RETURN 'HIVE';
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await client.queryObject(assetSymbol)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.asset_symbol (text) IS
    'Return the symbol(text) of an asset object like {"nai": "@@000000021", "amount": "2123", "precision": 3}';`)

  // Check if the string is valid json
  const isJson = `CREATE OR REPLACE FUNCTION hafsql.is_json(text)
    RETURNS bool
    AS $$
    BEGIN
      RETURN $1::jsonb IS NOT NULL;
    EXCEPTION WHEN SQLSTATE '22P02' THEN  -- invalid_text_representation
      RETURN false;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await client.queryObject(isJson)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.is_json (text) IS
    'Test if input text is valid JSON. Returns true, false, or NULL on NULL input.';`)

  // VESTS to HIVE equivalent
  const vestsToHive = `CREATE OR REPLACE FUNCTION hafsql.vests_to_hive(text)
    RETURNS numeric(12, 3)
    AS $$
    DECLARE
      hive_amount numeric;
    BEGIN
      SELECT $1::numeric / power(10, 6) / vests_per_hive FROM hafsql.dynamic_global_properties ORDER BY block_num DESC LIMIT 1
      INTO STRICT hive_amount;
      RETURN hive_amount::numeric(12, 3);
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await client.queryObject(vestsToHive)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.vests_to_hive (text) IS
    'Return HIVE equivalent of the VESTS or RC';`)

  // VESTS to HIVE at certain block
  const vestsToHiveAtBlock =
    `CREATE OR REPLACE FUNCTION hafsql.vests_to_hive(text, int4)
    RETURNS numeric(12, 3)
    AS $$
    DECLARE
      hive_amount numeric;
    BEGIN
      SELECT $1::numeric / power(10, 6) / vests_per_hive FROM hafsql.dynamic_global_properties WHERE block_num = $2 LIMIT 1
      INTO STRICT hive_amount;
      RETURN hive_amount::numeric(12, 3);
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`
  await client.queryObject(vestsToHiveAtBlock)
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.vests_to_hive (text, int4) IS
    'Return HIVE equivalent of the VESTS or RC at certain block_num';`,
  )
}

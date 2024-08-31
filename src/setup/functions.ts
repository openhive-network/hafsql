import { pool } from '../helpers/database.ts'

export const setupFunctions = async () => {
  // `using` so don't need to release the client
  using client = await pool.connect()

  // hafsql.asset_amount(text)
  // Get the asset amount from the asset object
  await client.queryObject(`CREATE OR REPLACE FUNCTION hafsql.asset_amount(text)
    RETURNS numeric
    AS $$
    DECLARE
      amount numeric;
    BEGIN
      SELECT ($1::jsonb->>'amount')::numeric / power(10, ($1::jsonb->>'precision')::numeric) INTO STRICT amount;
      RETURN amount::numeric;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.asset_amount (text) IS
    'Return the calculated amount(float) of an asset object like {"nai": "@@000000021", "amount": "2123", "precision": 3}';`)

  // hafsql.asset_symbol(text)
  // Get the asset symbol from the asset object
  await client.queryObject(`CREATE OR REPLACE FUNCTION hafsql.asset_symbol(text)
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
    RETURNS NULL ON NULL INPUT;`)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.asset_symbol (text) IS
    'Return the symbol(text) of an asset object like {"nai": "@@000000021", "amount": "2123", "precision": 3}';`)

  // hafsql.is_json(text)
  // Check if the string is valid json
  await client.queryObject(`CREATE OR REPLACE FUNCTION hafsql.is_json(text)
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
    RETURNS NULL ON NULL INPUT;`)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.is_json (text) IS
    'Test if input text is valid JSON. Returns true, false, or NULL on NULL input.';`)

  // hafsql.vests_to_hive(numeric, int4 default NULL)
  // VESTS to HIVE equivalent
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.vests_to_hive(numeric, int4 default NULL)
    RETURNS numeric(15, 3)
    AS $$
    DECLARE
      hive_amount numeric(15, 3);
    BEGIN
      SELECT CASE WHEN $2 is NULL THEN
        (SELECT $1 / vests_per_hive FROM hafsql.dynamic_global_properties ORDER BY block_num DESC LIMIT 1)
      ELSE
        (SELECT $1 / vests_per_hive FROM hafsql.dynamic_global_properties WHERE block_num = $2 LIMIT 1)
      END
      INTO STRICT hive_amount;
      RETURN hive_amount::numeric(15, 3);
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.vests_to_hive (numeric, int4) IS
    'Return HIVE equivalent of the VESTS optionally at certain block_num';`,
  )

  // hafsql.rc_to_hive(numeric, int4 default NULL)
  // RC to HIVE equivalent
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.rc_to_hive(numeric, int4 default NULL)
    RETURNS numeric(15, 3)
    AS $$
    BEGIN
      RETURN hafsql.vests_to_hive(($1 / power(10, 6))::numeric, $2);
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.rc_to_hive (numeric, int4) IS
    'Return HIVE equivalent of the RC optionally at certain block_num';`,
  )

  // hafsql.get_trx_id(int8)
  // Get trx_id from op_id
  await client.queryObject(`CREATE OR REPLACE FUNCTION hafsql.get_trx_id(int8)
    RETURNS text
    AS $$
    DECLARE
      trxid text;
    BEGIN
      SELECT t.trx_id FROM hafsql.operations o
        JOIN hafsql.transactions t
          ON t.block_num = o.block_num
          AND t.trx_in_block = o.trx_in_block
        WHERE o.id = $1
        INTO trxid;
      RETURN trxid;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`)
  await client.queryObject(`COMMENT ON FUNCTION hafsql.get_trx_id (int8) IS
    'Return trx_id from op_id';`)

  // hafsql.to_json(text)
  // Cast json string into JSONB - return null on invalid json
  await client.queryObject(`CREATE OR REPLACE FUNCTION hafsql.to_json(text)
    RETURNS jsonb
    AS $$
    DECLARE
      jsonified jsonb;
    BEGIN
      SELECT CASE WHEN hafsql.is_json($1) THEN $1::jsonb ELSE NULL END
        INTO jsonified;
      RETURN jsonified;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`)
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.to_json (text) IS
    'Cast valid json TEXT into JSONB and return NULL on invalid json string';`,
  )

  // hafsql.last_op_id_from_block_num(int4)
  // Get highest op_id inside a block
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.last_op_id_from_block_num(int4)
    RETURNS int8
    AS $$
    BEGIN
      RETURN (SELECT id FROM hive.operations
        WHERE hive.operation_id_to_block_num(id) = $1
        ORDER BY id DESC limit 1);
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.last_op_id_from_block_num (int4) IS
    'Get highest op_id inside a block';`,
  )

  // hafsql.first_op_id_from_block_num(int4)
  // Get lowest op_id inside a block
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.first_op_id_from_block_num(int4)
    RETURNS int8
    AS $$
    BEGIN
      RETURN (SELECT id FROM hive.operations
        WHERE hive.operation_id_to_block_num(id) = $1
        ORDER BY id ASC limit 1);
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.first_op_id_from_block_num (int4) IS
    'Get lowest op_id inside a block';`,
  )

  // hafsql.get_next_block_range(text)
  // Return a range of 49999 block numbers e.g. [1, 50000]
  // Probably can increase - have to test
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.get_next_block_range(text)
    RETURNS int4[]
    AS $$
    DECLARE
      last_num int4;
      head_num int4;
    BEGIN
      SELECT num INTO STRICT head_num FROM hive.blocks ORDER BY num DESC LIMIT 1;
      SELECT last_block_num INTO STRICT last_num FROM hafsql.sync_data WHERE table_name = $1;
      RETURN
        CASE WHEN head_num > last_num THEN
          CASE WHEN head_num >= last_num + 50000
            THEN ARRAY[last_num + 1, last_num + 50000]
            ELSE ARRAY[last_num + 1, head_num]
          END
        ELSE
          NULL
        END;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.get_next_block_range (text) IS
    'Used by HafSQL to sync blocks';`,
  )

  // hafsql.parse_reputation(int8)
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.parse_reputation(int8)
    RETURNS numeric(6, 2)
    AS $$
    BEGIN
      RETURN CASE WHEN $1 > 0 THEN ((log10($1 - 10) - 9) * 9 + 25)::numeric(6, 2)
        ELSE (-(log10(-$1 - 10) - 9) * 9 + 25)::numeric(6, 2) END;
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE
    RETURNS NULL ON NULL INPUT;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.parse_reputation (int8) IS
    'Parse large reputation number into user friendly number';`,
  )

  // hafsql.get_balance(int4, int4 default NULL)
  // Get account balance - optionally at certain block_num
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.get_balance(int4, int4 default NULL)
    RETURNS table (hive numeric, hbd numeric, vests numeric, hp numeric)
    AS $$
    BEGIN
      CASE WHEN $2 is NULL THEN
        RETURN QUERY
          (SELECT b.hive, b.hbd, b.vests, hafsql.vests_to_hive(b.vests) AS hp
          FROM hafsql.balances_table b WHERE b.account = $1);
      ELSE
		CASE WHEN
			(SELECT EXISTS(SELECT 1 FROM hafsql.balances_history_table b WHERE b.account = $1 AND b.block_num <= $2 LIMIT 1)) = true
		THEN RETURN QUERY
      (SELECT b.hive, b.hbd, b.vests, hafsql.vests_to_hive(b.vests, $2) AS hp
      FROM hafsql.balances_history_table b WHERE b.account = $1 AND b.block_num <= $2
      ORDER BY b.block_num DESC LIMIT 1);
		ELSE RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, 0::numeric;
		END CASE;
      END CASE;
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.get_balance (int4, int4) IS
    'Get account balance - optionally at certain block_num including the historical hp equivalent';`,
  )

  // hafsql.get_balance(text, int4 default NULL)
  // Get account balance - optionally at certain block_num
  await client.queryObject(
    `CREATE OR REPLACE FUNCTION hafsql.get_balance(text, int4 default NULL)
    RETURNS table (hive numeric, hbd numeric, vests numeric, hp numeric)
    AS $$
    DECLARE
      account int4;
    BEGIN
      SELECT a.id FROM hive.accounts a WHERE a.name = $1 INTO account;
      RETURN QUERY SELECT * FROM hafsql.get_balance(account, $2);
    END
    $$
    LANGUAGE plpgsql
    IMMUTABLE;`,
  )
  await client.queryObject(
    `COMMENT ON FUNCTION hafsql.get_balance (text, int4) IS
    'Get account balance - optionally at certain block_num including the historical hp equivalent';`,
  )
}

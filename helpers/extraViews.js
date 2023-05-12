import { pool } from "./database.js"

export const setupExtraViews = async () => {
  // Blocks
  await pool.query(`CREATE OR REPLACE VIEW hafsql."Blocks"
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    b.producer_account_id as witness,
    b.extensions as extensions,
    b.signing_key as signing_key,
    encode(b.hash, 'hex'::text) as hash,
    encode(b.prev, 'hex'::text) as prev,
    encode(b.witness_signature, 'hex'::text) as signature,
    encode(b.transaction_merkle_root, 'hex'::text) as transaction_merkle_root
    FROM hive.blocks b;`)

  // DynamicGlobalProperties
  await pool.query(`CREATE OR REPLACE VIEW hafsql."DynamicGlobalProperties"
  AS SELECT b.num AS block_num,
    b.created_at as "timestamp",
    b.total_vesting_fund_hive as total_vesting_fund_hive,
    b.total_vesting_shares as total_vesting_shares,
    b.total_reward_fund_hive as total_reward_fund_hive,
    b.virtual_supply as virtual_supply,
    b.current_supply as current_supply,
    b.current_hbd_supply as current_hbd_supply,
    b.hbd_interest_rate as hbd_interest_rate,
    b.dhf_interval_ledger as dhf_interval_ledger
    FROM hive.blocks b;`)

  // Delegations
  await pool.query(`CREATE OR REPLACE VIEW hafsql."Delegations"
  AS SELECT x.delegator,
    x.delegatee,
    x.vests
    FROM hafsql.delegations_table x;`)

    
    
}

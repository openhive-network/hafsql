import pg from "pg";
import { config } from "dotenv";
config();

// Indexes need haf_admin access
const pool = new pg.Pool({
  application_name: "HafSQL-indexes",
  database: process.env.PGDATABASE || "haf_block_log",
  user: "haf_admin",
  host: process.env.PGHOST || "172.17.0.2",
  port: process.env.PGPORT || 5432,
  max: process.env.PGPOOLSIZE || 2,
  min: 1,
});

const dropOperationIndexes = async () => {
  await pool.query(`DROP INDEX IF EXISTS
  hive.hive_operations_op_type_id_id_hafsql,
  hive.hafsql_voter_idx,
  hive.hafsql_author_idx,
  hive.hafsql_author_permlink_idx,
  hive.hafsql_parent_author_idx,
  hive.hafsql_parent_author_parent_permlink_idx,
  hive.hafsql_from_idx,
  hive.hafsql_to_idx,
  hive.hafsql_memo_idx,
  hive.hafsql_account_idx,
  hive.hafsql_owner_idx,
  hive.hafsql_orderid_idx,
  hive.hafsql_publisher_idx,
  hive.hafsql_requestid_idx,
  hive.hafsql_creator_idx,
  hive.hafsql_new_account_name_idx,
  hive.hafsql_witness_idx,
  hive.hafsql_proxy_idx,
  hive.hafsql_id_opid_idx,
  hive.hafsql_from_account_idx,
  hive.hafsql_to_account_idx,
  hive.hafsql_account_to_recover_idx,
  hive.hafsql_new_recovery_account_idx,
  hive.hafsql_delegator_id_idx,
  hive.hafsql_delegatee_idx,
  hive.hafsql_curator_idx,
  hive.hafsql_current_owner_idx,
  hive.hafsql_current_orderid_idx,
  hive.hafsql_open_owner_idx,
  hive.hafsql_open_orderid_idx,
  hive.hafsql_benefactor_idx,
  hive.hafsql_producer_idx,
  hive.hafsql_receiver_idx;`);
};

const main = async () => {
  console.log("Dropping indexes...");
  await dropOperationIndexes();
  console.log("Done.");
  pool.end();
};

main();

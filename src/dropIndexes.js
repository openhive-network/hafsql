import pg from "pg"
import { config } from "dotenv"
config()

// Indexes need haf_admin access
const pool = new pg.Pool({
  application_name: 'HafSQL',
  database: process.env.PGDATABASE || 'haf_block_log',
  user: 'haf_admin',
  host: process.env.PGHOST || '172.17.0.2',
  port: process.env.PGPORT || 5432,
  max: process.env.PGPOOLSIZE || 10,
  min: 1
})

const dropIndexes = async () => {
  await pool.query(`DROP INDEX IF EXISTS
    hive.hafsql_operations_voter,
    hive.hafsql_operations_author,
    hive.hafsql_operations_permlink,
    hive.hafsql_operations_parent_author,
    hive.hafsql_operations_parent_permlink,
    hive.hafsql_operations_from,
    hive.hafsql_operations_to,
    hive.hafsql_operations_memo,
    hive.hafsql_operations_account,
    hive.hafsql_operations_owner,
    hive.hafsql_operations_orderid,
    hive.hafsql_operations_publisher,
    hive.hafsql_operations_requestid,
    hive.hafsql_operations_creator,
    hive.hafsql_operations_new_account_name,
    hive.hafsql_operations_witness,
    hive.hafsql_operations_proxy,
    hive.hafsql_operations_id,
    hive.hafsql_operations_required_auths,
    hive.hafsql_operations_required_posting_auths,
    hive.hafsql_operations_from_account,
    hive.hafsql_operations_to_account,
    hive.hafsql_operations_account_to_recover,
    hive.hafsql_operations_new_recovery_account,
    hive.hafsql_operations_delegator,
    hive.hafsql_operations_delegatee,
    hive.hafsql_operations_proposal_ids,
    hive.hafsql_operations_curator,
    hive.hafsql_operations_current_owner,
    hive.hafsql_operations_current_orderid,
    hive.hafsql_operations_open_owner,
    hive.hafsql_operations_open_orderid,
    hive.hafsql_operations_benefactor,
    hive.hafsql_operations_producer,
    hive.hafsql_operations_proposal_id,
    hive.hafsql_operations_receiver;`)
}

const main = async () => {
  console.log('Dropping indexes...')
  await dropIndexes()
  console.log('Done.')
  pool.end()
}

main()

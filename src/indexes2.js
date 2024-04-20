import pg from 'pg'
import { config } from 'dotenv'
import { opIds } from '../helpers/operationIds'
config()

// Indexes need haf_admin access
// max = 2 - need an extra connection for gracefulShutdown()
const pool = new pg.Pool({
  application_name: 'HafSQL-indexes',
  database: process.env.PGDATABASE || 'haf_block_log',
  user: 'haf_admin',
  host: process.env.PGHOST || '172.17.0.2',
  port: process.env.PGPORT || 5432,
  max: 10,
  min: 1
})

let finishedIndexes = 0

// const CONCURRENTLY = process.env.CONCURRENTLY === 'false' ? '' : 'CONCURRENTLY'
// const INDEXMAXTHREADS = process.env.INDEXMAXTHREADS || 4
// const SKIPINDEXES = process.env.SKIPOPERATIONINDEXES === 'true'

const indexesArray = [
  // (op_type_id, id), Needed for sorting by ID asc or desc
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS hive_operations_op_type_id_id_hafsql ON hive.operations (op_type_id, id)',
  // ("timestamp")
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS hive_operations_timestamp_hafsql ON hive.operations ("timestamp")',
  // voter
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voter_idx ON hive.operations ((body_binary::jsonb->'value'->>'voter'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.vote}, ${opIds.update_proposal_votes});`,
  // author
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_author_idx ON hive.operations
    ((body_binary::jsonb->'value'->>'author'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.vote}, ${opIds.comment}, ${opIds.delete_comment}, ${opIds.comment_options}, ${opIds.author_reward}, ${opIds.comment_reward}, ${opIds.effective_comment_vote});`,
  // parent_author
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_parent_author_idx ON hive.operations
    ((body_binary::jsonb->'value'->>'parent_author'), id DESC) WHERE op_type_id = ${opIds.comment};`,
  // parent_author, parent_permlink
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_parent_author_parent_permlink_idx ON hive.operations
    ((body_binary::jsonb->'value'->>'parent_author'), (body_binary::jsonb->'value'->>'parent_permlink'), id DESC) WHERE op_type_id = ${opIds.comment};`,
  // from
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_from_idx ON hive.operations ((body_binary::jsonb->'value'->>'from'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.transfer}, ${opIds.transfer_to_vesting}, ${opIds.transfer_to_savings}, ${opIds.transfer_from_savings}, ${opIds.cancel_transfer_from_savings}, ${opIds.fill_transfer_from_savings});`,
  // to
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_to_idx ON hive.operations ((body_binary::jsonb->'value'->>'to'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.transfer}, ${opIds.transfer_to_vesting}, ${opIds.transfer_to_savings}, ${opIds.transfer_from_savings}, ${opIds.fill_transfer_from_savings});`,
  // memo
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_memo_idx ON hive.operations ((body_binary::jsonb->'value'->>'memo'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.transfer}, ${opIds.transfer_to_savings}, ${opIds.transfer_from_savings}, ${opIds.recurrent_transfer}, ${opIds.fill_transfer_from_savings}, ${opIds.fill_recurrent_transfer}, ${opIds.failed_recurrent_transfer});`,
  // TODO: remove this after locale C on HAF
  // memo - for queries with LIKE 'test%'
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_memo_pattern_idx ON hive.operations ((body_binary::jsonb->'value'->>'memo') text_pattern_ops, op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.transfer});`,
  // account
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_account_idx ON hive.operations ((body_binary::jsonb->'value'->>'account'), op_type_id, id DESC)
    WHERE op_type_id IN(${opIds.withdraw_vesting}, ${opIds.account_update}, ${opIds.account_witness_vote}, ${opIds.account_witness_proxy}, ${opIds.claim_reward_balance}, ${opIds.account_update2}, ${opIds.return_vesting_delegation}, ${opIds.changed_recovery_account});`,
  // owner
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_owner_idx ON hive.operations ((body_binary::jsonb->'value'->>'owner'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.limit_order_create}, ${opIds.limit_order_cancel}, ${opIds.convert}, ${opIds.witness_update}, ${opIds.limit_order_create2}, ${opIds.witness_set_properties}, ${opIds.collateralized_convert}, ${opIds.fill_convert_request}, ${opIds.expired_account_notification}, ${opIds.fill_collateralized_convert_request}, ${opIds.collateralized_convert_immediate_conversion});`,
  // orderid
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_orderid_idx ON hive.operations ((body_binary::jsonb->'value'->>'orderid'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.limit_order_create}, ${opIds.limit_order_cancel}, ${opIds.limit_order_create2});`,
  // publisher
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_publisher_idx ON hive.operations ((body_binary::jsonb->'value'->>'publisher'), id DESC)
    WHERE op_type_id = ${opIds.feed_publish};`,
  // creator
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_creator_idx ON hive.operations ((body_binary::jsonb->'value'->>'creator'), op_type_id, id DESC)
    WHERE op_type_id IN(${opIds.account_create}, ${opIds.claim_account}, ${opIds.create_claimed_account}, ${opIds.account_create_with_delegation}, ${opIds.escrow_approve});`,
  // new_account_name
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_new_account_name_idx ON hive.operations ((body_binary::jsonb->'value'->>'new_account_name'), op_type_id, id DESC)
    WHERE op_type_id IN(${opIds.account_create}, ${opIds.create_claimed_account}, ${opIds.account_create_with_delegation}, ${opIds.account_created});`,
  // witness
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_witness_idx ON hive.operations ((body_binary::jsonb->'value'->>'witness'), id DESC)
    WHERE op_type_id = ${opIds.account_witness_vote};`,
  // proxy
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_proxy_idx ON hive.operations ((body_binary::jsonb->'value'->>'proxy'), id DESC)
    WHERE op_type_id = ${opIds.account_witness_proxy};`,
  // from_account
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_from_account_idx ON hive.operations ((body_binary::jsonb->'value'->>'from_account'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.set_withdraw_vesting_route}, ${opIds.fill_vesting_withdraw}, ${opIds.transfer_to_vesting_completed});`,
  // to_account
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_to_account_idx ON hive.operations ((body_binary::jsonb->'value'->>'to_account'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.set_withdraw_vesting_route}, ${opIds.fill_vesting_withdraw}, ${opIds.transfer_to_vesting_completed});`,
  // account_to_recover
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_account_to_recover_idx ON hive.operations ((body_binary::jsonb->'value'->>'account_to_recover'), id DESC)
    WHERE op_type_id = ${opIds.change_recovery_account};`,
  // new_recovery_account
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_new_recovery_account_idx ON hive.operations ((body_binary::jsonb->'value'->>'new_recovery_account'), id DESC)
    WHERE op_type_id = ${opIds.change_recovery_account};`,
  // delegator
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_delegator_id_idx ON hive.operations ((body_binary::jsonb->'value'->>'delegator'), id DESC)
    WHERE op_type_id = ${opIds.delegate_vesting_shares};`,
  // delegatee
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_delegatee_idx ON hive.operations ((body_binary::jsonb->'value'->>'delegatee'), id DESC)
    WHERE op_type_id = ${opIds.delegate_vesting_shares};`,
  // curator
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_curator_idx ON hive.operations ((body_binary::jsonb->'value'->>'curator'), id DESC)
    WHERE op_type_id = ${opIds.curation_reward};`,
  // current_owner
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_current_owner_idx ON hive.operations ((body_binary::jsonb->'value'->>'current_owner'), id DESC)
    WHERE op_type_id = ${opIds.fill_order};`,
  // current_orderid
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_current_orderid_idx ON hive.operations ((body_binary::jsonb->'value'->>'current_orderid'), id DESC)
    WHERE op_type_id = ${opIds.fill_order};`,
  // open_owner
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_open_owner_idx ON hive.operations ((body_binary::jsonb->'value'->>'open_owner'), id DESC)
    WHERE op_type_id = ${opIds.fill_order};`,
  // open_orderid
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_open_orderid_idx ON hive.operations ((body_binary::jsonb->'value'->>'open_orderid'), id DESC)
    WHERE op_type_id = ${opIds.fill_order};`,
  // benefactor
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_benefactor_idx ON hive.operations ((body_binary::jsonb->'value'->>'benefactor'), id DESC)
    WHERE op_type_id = ${opIds.comment_benefactor_reward};`,
  // producer
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_producer_idx ON hive.operations ((body_binary::jsonb->'value'->>'producer'), id DESC)
    WHERE op_type_id = ${opIds.producer_reward};`,
  // receiver
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_receiver_idx ON hive.operations ((body_binary::jsonb->'value'->>'receiver'), id DESC)
    WHERE op_type_id = ${opIds.proposal_pay};`,
  // author, permlink -* used in comments
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_author_permlink_idx ON hive.operations
    ((body_binary::jsonb->'value'->>'author'), (body_binary::jsonb->'value'->>'permlink'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.vote}, ${opIds.comment}, ${opIds.delete_comment}, ${opIds.comment_options}, ${opIds.author_reward}, ${opIds.comment_reward}, ${opIds.effective_comment_vote});`,
  // id -* used in follows, communities,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_id_opid_idx ON hive.operations ((body_binary::jsonb->'value'->>'id'), op_type_id, id DESC)
    WHERE op_type_id IN (${opIds.custom}, ${opIds.custom_json});`
]

const makeIndexes = async () => {
  console.log('Creating indexes... Will take a long time...', new Date())
  for (let i = 0; i < indexesArray.length; i++) {
    const query = new pg.Query(indexesArray[i])
    query.on('end', () => {
      finishedIndexes++
      console.log('Total indexes created so far:', finishedIndexes, new Date())
    })
    pool.query(query)
  }
}
makeIndexes()

// let i2 = 0
// setInterval(() => {
//   if (finishedIndexes !== i2) {
//     console.log('Total indexes created so far: ' + finishedIndexes)
//   }
//   i2 = finishedIndexes
// }, 5000)

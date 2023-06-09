import pg from 'pg'
import { config } from 'dotenv'
config()

// Indexes need haf_admin access
export const pool = new pg.Pool({
  application_name: 'HafSQL',
  database: process.env.PGDATABASE || 'haf_block_log',
  user: 'haf_admin',
  host: process.env.PGHOST || '172.17.0.2',
  port: process.env.PGPORT || 5432,
  max: process.env.PGPOOLSIZE || 10,
  min: 1
})

const CONCURRENTLY = process.env.CONCURRENTLY === 'false' ? '' : 'CONCURRENTLY'

const total = 37
const OPs = 49

// Needed for sorting by ID asc or desc
const setupHafIndexes = async () => {
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hive_operations_op_type_id_id_hafsql ON hive.operations (op_type_id, id)`
  )
  console.log('Created ' + total + ' out of ' + total + ' indexes...')
}

export const setupOperationIndexes = async () => {
  // voter
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voter_idx ON hive.operations ((body::jsonb->'value'->>'voter'), op_type_id, id DESC)
      WHERE op_type_id IN (0, 45);`
  )
  // author
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_author_idx ON hive.operations
      ((body::jsonb->'value'->>'author'), op_type_id, id DESC)
      WHERE op_type_id IN (0, 1, 17, 19, ${OPs + 2}, ${OPs + 4}, ${OPs + 23});`
  )
  // author, permlink
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_author_permlink_idx ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), op_type_id, id DESC)
      WHERE op_type_id IN (0, 1, 17, 19, ${OPs + 2}, ${OPs + 4}, ${OPs + 23});`
  )
  console.log('Created 3 out of ' + total + ' indexes...')

  // parent_author
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_parent_author_idx ON hive.operations
      ((body::jsonb->'value'->>'parent_author'), id DESC) WHERE op_type_id = 1;`
  )
  // parent_author, parent_permlink
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_parent_author_parent_permlink_idx ON hive.operations
      ((body::jsonb->'value'->>'parent_author'), (body::jsonb->'value'->>'parent_permlink'), id DESC) WHERE op_type_id = 1;`
  )
  console.log('Created 5 out of ' + total + ' indexes...')

  // from
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_from_idx ON hive.operations ((body::jsonb->'value'->>'from'), op_type_id, id DESC)
      WHERE op_type_id IN (2, 3, 32, 33, 34, ${OPs + 10});`
  )
  // to
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_to_idx ON hive.operations ((body::jsonb->'value'->>'to'), op_type_id, id DESC)
      WHERE op_type_id IN (2, 3, 32, 33, ${OPs + 10});`
  )
  // memo
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_memo_idx ON hive.operations ((body::jsonb->'value'->>'memo'), op_type_id, id DESC)
      WHERE op_type_id IN (2, 32);`
  )
  console.log('Created 8 out of ' + total + ' indexes...')

  // account
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_account_idx ON hive.operations ((body::jsonb->'value'->>'account'), op_type_id, id DESC)
      WHERE op_type_id IN(4, 10, 12, 13, 39, 43, ${OPs + 13}, ${OPs + 27});`
  )
  console.log('Created 9 out of ' + total + ' indexes...')

  // owner
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_owner_idx ON hive.operations ((body::jsonb->'value'->>'owner'), op_type_id, id DESC)
      WHERE op_type_id IN (5, 6, 8, 11, 21, 42, 48, ${OPs + 1}, ${OPs + 26}, ${OPs + 32}, ${OPs + 39});`
  )
  // orderid
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_orderid_idx ON hive.operations ((body::jsonb->'value'->>'orderid'), op_type_id, id DESC)
      WHERE op_type_id IN (5, 6, 21);`
  )
  console.log('Created 11 out of ' + total + ' indexes...')

  // publisher
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_publisher_idx ON hive.operations ((body::jsonb->'value'->>'publisher'), id DESC)
      WHERE op_type_id = 7;`
  )
  console.log('Created 10 out of ' + total + ' indexes...')

  // requestid
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_requestid_idx ON hive.operations ((body::jsonb->'value'->>'requestid'), op_type_id, id DESC)
      WHERE op_type_id IN (8, 48, ${OPs + 1}, ${OPs + 32}, ${OPs + 39});`
  )
  console.log('Created 13 out of ' + total + ' indexes...')

  // creator
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_creator_idx ON hive.operations ((body::jsonb->'value'->>'creator'), op_type_id, id DESC)
      WHERE op_type_id IN(9, 22, 23, 41, ${OPs + 31});`
  )
  // new_account_name
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_new_account_name_idx ON hive.operations ((body::jsonb->'value'->>'new_account_name'), op_type_id, id DESC)
      WHERE op_type_id IN(9, 23, 41, ${OPs + 31});`
  )
  console.log('Created 15 out of ' + total + ' indexes...')

  // witness
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_witness_idx ON hive.operations ((body::jsonb->'value'->>'witness'), id DESC)
      WHERE op_type_id = 12;`
  )

  console.log('Created 16 out of ' + total + ' indexes...')

  // proxy
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_proxy_idx ON hive.operations ((body::jsonb->'value'->>'proxy'), id DESC)
      WHERE op_type_id = 13;`
  )
  console.log('Created 17 out of ' + total + ' indexes...')

  // id
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_id_opid_idx ON hive.operations ((body::jsonb->'value'->>'id'), op_type_id, id DESC)
      WHERE op_type_id IN (15, 18);`
  )
  // required_auths
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_required_auths_idx ON hive.operations USING GIN ((body::jsonb->'value'->'required_auths'), op_type_id, id DESC)
      WHERE op_type_id IN (15, 18);`
  )
  console.log('Created 19 out of ' + total + ' indexes...')

  // required_posting_auths
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_required_posting_auths_idx ON hive.operations USING GIN ((body::jsonb->'value'->'required_posting_auths'), op_type_id, id DESC)
      WHERE op_type_id IN (15, 18);`
  )
  console.log('Created 20 out of ' + total + ' indexes...')

  // from_account
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_from_account_idx ON hive.operations ((body::jsonb->'value'->>'from_account'), op_type_id, id DESC)
      WHERE op_type_id IN (20, ${OPs + 7});`
  )
  // to_account
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_to_account_idx ON hive.operations ((body::jsonb->'value'->>'to_account'), op_type_id, id DESC)
      WHERE op_type_id IN (20, ${OPs + 7});`
  )
  console.log('Created 22 out of ' + total + ' indexes...')

  // account_to_recover
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_account_to_recover_idx ON hive.operations ((body::jsonb->'value'->>'account_to_recover'), id DESC)
      WHERE op_type_id = 26;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_new_recovery_account_idx ON hive.operations ((body::jsonb->'value'->>'new_recovery_account'), id DESC)
      WHERE op_type_id = 26;`
  )
  console.log('Created 24 out of ' + total + ' indexes...')

  // delegator
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_delegator_id_idx ON hive.operations ((body::jsonb->'value'->>'delegator'), id DESC)
      WHERE op_type_id = 40;`
  )
  // delegatee
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_delegatee_idx ON hive.operations ((body::jsonb->'value'->>'delegatee'), id DESC)
      WHERE op_type_id = 40;`
  )
  console.log('Created 26 out of ' + total + ' indexes...')

  // proposal_ids
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_proposal_ids_idx ON hive.operations ((body::jsonb->'value'->'proposal_ids'), id DESC)
      WHERE op_type_id = 45;`
  )
  console.log('Created 27 out of ' + total + ' indexes...')
}

export const setupVirtualOperationIndexes = async () => {
  // curator
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_curator_idx ON hive.operations ((body::jsonb->'value'->>'curator'), id DESC)
      WHERE op_type_id = ${OPs + 3};`
  )
  console.log('Created 28 out of ' + total + ' indexes...')

  // VOFillOrder 49 + 8
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_current_owner_idx ON hive.operations ((body::jsonb->'value'->>'current_owner'), id DESC)
      WHERE op_type_id = ${OPs + 8};`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_current_orderid_idx ON hive.operations ((body::jsonb->'value'->>'current_orderid'), id DESC)
      WHERE op_type_id = ${OPs + 8};`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_open_owner_idx ON hive.operations ((body::jsonb->'value'->>'open_owner'), id DESC)
      WHERE op_type_id = ${OPs + 8};`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_open_orderid_idx ON hive.operations ((body::jsonb->'value'->>'open_orderid'), id DESC)
      WHERE op_type_id = ${OPs + 8};`
  )
  console.log('Created 32 out of ' + total + ' indexes...')

  // VOCommentBenefactorReward 49 + 14
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_benefactor_idx ON hive.operations ((body::jsonb->'value'->>'benefactor'), id DESC)
      WHERE op_type_id = ${OPs + 14};`
  )
  console.log('Created 33 out of ' + total + ' indexes...')

  // VOProducerReward 49 + 15
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_producer_idx ON hive.operations ((body::jsonb->'value'->>'producer'), id DESC)
      WHERE op_type_id = ${OPs + 15};`
  )
  console.log('Created 34 out of ' + total + ' indexes...')

  // VOProposalPay 49 + 17
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_proposal_id_idx ON hive.operations ((body::jsonb->'value'->>'proposal_id'), id DESC)
      WHERE op_type_id = ${OPs + 17};`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_receiver_idx ON hive.operations ((body::jsonb->'value'->>'receiver'), id DESC)
      WHERE op_type_id = ${OPs + 17};`
  )
  console.log('Created 36 out of ' + total + ' indexes...')
}

const main = async () => {
  const startTime = Date.now() / 1000
  console.log(`Creating indexes ${CONCURRENTLY}. It will take a long time...`)
  await setupOperationIndexes()
  await setupVirtualOperationIndexes()
  await setupHafIndexes()
  const timeSpent = (Date.now() / 1000 - startTime) / 60
  console.log(`Indexes done. Total time spent = ${timeSpent} minutes`)
  console.log('Draining the pool...')
  pool.end()
}

const gracefulShutdown = async () => {
  console.info('Shutting down... a moment please.')
  await pool.end()
  console.log('Postgresql pool drained.')
  process.exit()
}
process.on('SIGTERM', () => gracefulShutdown())
process.on('SIGINT', () => gracefulShutdown())

main()

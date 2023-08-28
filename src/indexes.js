import pg from 'pg'
import { config } from 'dotenv'
config()

// Indexes need haf_admin access
const pool = new pg.Pool({
  application_name: 'HafSQL-indexes',
  database: process.env.PGDATABASE || 'haf_block_log',
  user: 'haf_admin',
  host: process.env.PGHOST || '172.17.0.2',
  port: process.env.PGPORT || 5432,
  max: process.env.PGPOOLSIZE || 2,
  min: 1
})

const CONCURRENTLY = process.env.CONCURRENTLY === 'false' ? '' : 'CONCURRENTLY'
const INDEXMAXTHREADS = process.env.INDEXMAXTHREADS || 4
const SKIPINDEXES = process.env.SKIPOPERATIONINDEXES === true

const OPs = 49
const client = await pool.connect()
let i = 0

// Needed for sorting by ID asc or desc
const setupHafIndexes = async () => {
  const pool = client
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hive_operations_op_type_id_id_hafsql ON hive.operations (op_type_id, id)`
  )
  i++
}

export const setupOperationIndexes = async () => {
  const pool = client
  if (!SKIPINDEXES) {
    // voter
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voter_idx ON hive.operations ((body::jsonb->'value'->>'voter'), op_type_id, id DESC)
        WHERE op_type_id IN (0, 45);`
    )
    i++
    // author
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_author_idx ON hive.operations
        ((body::jsonb->'value'->>'author'), op_type_id, id DESC)
        WHERE op_type_id IN (0, 1, 17, 19, ${OPs + 2}, ${OPs + 4}, ${
        OPs + 23
      });`
    )
    i++
    // parent_author
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_parent_author_idx ON hive.operations
      ((body::jsonb->'value'->>'parent_author'), id DESC) WHERE op_type_id = 1;`
    )
    i++
    // parent_author, parent_permlink
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_parent_author_parent_permlink_idx ON hive.operations
      ((body::jsonb->'value'->>'parent_author'), (body::jsonb->'value'->>'parent_permlink'), id DESC) WHERE op_type_id = 1;`
    )
    i++
    // from
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_from_idx ON hive.operations ((body::jsonb->'value'->>'from'), op_type_id, id DESC)
        WHERE op_type_id IN (2, 3, 32, 33, 34, ${OPs + 10});`
    )
    i++
    // to
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_to_idx ON hive.operations ((body::jsonb->'value'->>'to'), op_type_id, id DESC)
        WHERE op_type_id IN (2, 3, 32, 33, ${OPs + 10});`
    )
    i++
    // memo
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_memo_idx ON hive.operations ((body::jsonb->'value'->>'memo'), op_type_id, id DESC)
        WHERE op_type_id IN (2, 32, 33, 49, ${OPs + 10}, ${OPs + 34}, ${
        OPs + 35
      });`
    )
    i++
    // account
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_account_idx ON hive.operations ((body::jsonb->'value'->>'account'), op_type_id, id DESC)
        WHERE op_type_id IN(4, 10, 12, 13, 39, 43, ${OPs + 13}, ${OPs + 27});`
    )
    i++
    // owner
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_owner_idx ON hive.operations ((body::jsonb->'value'->>'owner'), op_type_id, id DESC)
        WHERE op_type_id IN (5, 6, 8, 11, 21, 42, 48, ${OPs + 1}, ${OPs + 26}, ${
        OPs + 32
      }, ${OPs + 39});`
    )
    i++
    // orderid
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_orderid_idx ON hive.operations ((body::jsonb->'value'->>'orderid'), op_type_id, id DESC)
        WHERE op_type_id IN (5, 6, 21);`
    )
    i++
    // publisher
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_publisher_idx ON hive.operations ((body::jsonb->'value'->>'publisher'), id DESC)
        WHERE op_type_id = 7;`
    )
    i++
    // requestid
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_requestid_idx ON hive.operations ((body::jsonb->'value'->>'requestid'), op_type_id, id DESC)
        WHERE op_type_id IN (8, 48, ${OPs + 1}, ${OPs + 32}, ${OPs + 39});`
    )
    i++
    // creator
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_creator_idx ON hive.operations ((body::jsonb->'value'->>'creator'), op_type_id, id DESC)
        WHERE op_type_id IN(9, 22, 23, 41, ${OPs + 31});`
    )
    i++
    // new_account_name
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_new_account_name_idx ON hive.operations ((body::jsonb->'value'->>'new_account_name'), op_type_id, id DESC)
        WHERE op_type_id IN(9, 23, 41, ${OPs + 31});`
    )
    i++
    // witness
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_witness_idx ON hive.operations ((body::jsonb->'value'->>'witness'), id DESC)
        WHERE op_type_id = 12;`
    )
    i++
    // proxy
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_proxy_idx ON hive.operations ((body::jsonb->'value'->>'proxy'), id DESC)
        WHERE op_type_id = 13;`
    )
    i++
    // from_account
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_from_account_idx ON hive.operations ((body::jsonb->'value'->>'from_account'), op_type_id, id DESC)
        WHERE op_type_id IN (20, ${OPs + 7});`
    )
    i++
    // to_account
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_to_account_idx ON hive.operations ((body::jsonb->'value'->>'to_account'), op_type_id, id DESC)
        WHERE op_type_id IN (20, ${OPs + 7});`
    )
    i++
    // account_to_recover
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_account_to_recover_idx ON hive.operations ((body::jsonb->'value'->>'account_to_recover'), id DESC)
        WHERE op_type_id = 26;`
    )
    i++
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_new_recovery_account_idx ON hive.operations ((body::jsonb->'value'->>'new_recovery_account'), id DESC)
        WHERE op_type_id = 26;`
    )
    i++
    // delegator
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_delegator_id_idx ON hive.operations ((body::jsonb->'value'->>'delegator'), id DESC)
        WHERE op_type_id = 40;`
    )
    i++
    // delegatee
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_delegatee_idx ON hive.operations ((body::jsonb->'value'->>'delegatee'), id DESC)
        WHERE op_type_id = 40;`
    )
    i++
  }

  /** Can't skip */
  // author, permlink -* used in comments
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_author_permlink_idx ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), op_type_id, id DESC)
      WHERE op_type_id IN (0, 1, 17, 19, ${OPs + 2}, ${OPs + 4}, ${OPs + 23});`
  )
  i++
  // id -* used in follows, communities
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_id_opid_idx ON hive.operations ((body::jsonb->'value'->>'id'), op_type_id, id DESC)
      WHERE op_type_id IN (15, 18);`
  )
  i++
}

export const setupVirtualOperationIndexes = async () => {
  const pool = client
  if (!SKIPINDEXES) {
    // curator
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_curator_idx ON hive.operations ((body::jsonb->'value'->>'curator'), id DESC)
        WHERE op_type_id = ${OPs + 3};`
    )
    i++
    // VOFillOrder 49 + 8
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_current_owner_idx ON hive.operations ((body::jsonb->'value'->>'current_owner'), id DESC)
        WHERE op_type_id = ${OPs + 8};`
    )
    i++
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_current_orderid_idx ON hive.operations ((body::jsonb->'value'->>'current_orderid'), id DESC)
        WHERE op_type_id = ${OPs + 8};`
    )
    i++
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_open_owner_idx ON hive.operations ((body::jsonb->'value'->>'open_owner'), id DESC)
        WHERE op_type_id = ${OPs + 8};`
    )
    i++
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_open_orderid_idx ON hive.operations ((body::jsonb->'value'->>'open_orderid'), id DESC)
        WHERE op_type_id = ${OPs + 8};`
    )
    i++
    // VOCommentBenefactorReward 49 + 14
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_benefactor_idx ON hive.operations ((body::jsonb->'value'->>'benefactor'), id DESC)
        WHERE op_type_id = ${OPs + 14};`
    )
    i++
    // VOProducerReward 49 + 15
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_producer_idx ON hive.operations ((body::jsonb->'value'->>'producer'), id DESC)
        WHERE op_type_id = ${OPs + 15};`
    )
    i++
    // VOProposalPay 49 + 17
    await pool.query(
      `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_receiver_idx ON hive.operations ((body::jsonb->'value'->>'receiver'), id DESC)
        WHERE op_type_id = ${OPs + 17};`
    )
    i++
  }
}

const main = async () => {
  const startTime = Date.now() / 1000
  console.log(
    `Creating indexes ${CONCURRENTLY} if not exists. It will take a long time...`
  )
  // client = await pool.connect()
  await client.query(
    `SET max_parallel_maintenance_workers = ${INDEXMAXTHREADS};`
  )
  await client.query('CREATE EXTENSION IF NOT EXISTS btree_gin;')
  await setupOperationIndexes()
  await setupVirtualOperationIndexes()
  await setupHafIndexes()
  clearInterval(interval1)
  const timeSpent = (Date.now() / 1000 - startTime) / 60
  console.log(`Indexes done. Total time spent = ${timeSpent} minutes`)
  console.log('Draining the pool...')
  client.release(true)
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

let i2 = 0
const interval1 = setInterval(() => {
  if (i !== i2) {
    console.log('Index created... ' + i)
  }
  i2 = i
}, 10000)

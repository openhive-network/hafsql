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

const CONCURRENTLY = process.env.CONCURRENTLY === 'false' ? '' : 'CONCURRENTLY'

// IF NEEDED - Probably will need
// const setupHafIndexes = async () => {
//   await pool.query('CREATE INDEX IF NOT EXISTS hive_operations_op_type_id_id_idx ON hive.operations (op_type_id, id)')
// }

const total = 36;

const setupOperationIndexes = async () => {
  console.log(`Creating operation indexes ${CONCURRENTLY}. This will take a few hours. Now = ` + new Date(Date.now()).toISOString())
  // TxVote 0 - TxUpdateProposalVotes 45
  // voter
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_voter ON hive.operations ((body::jsonb->'value'->>'voter'))
    WHERE op_type_id = 0 OR op_type_id = 45;`)
  console.log('Created 1 ot of ' + total + ' indexes...')

  // TxVote 0 - TxComment 1 - TxDeleteComment 17 - TxCommentOptions 19 - VOAuthorReward 49 + 2 - VOCommentReward 49 + 4 - VOEffectiveCommentVote 49 + 23
  // author
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_author ON hive.operations ((body::jsonb->'value'->>'author'))
    WHERE op_type_id = 0 OR op_type_id = 1 OR op_type_id = 17 OR op_type_id = 19 OR op_type_id = 49 + 2 OR op_type_id = 49 + 4 OR op_type_id = 49 + 23;`)
  console.log('Created 2 ot of ' + total + ' indexes...')

  // TxVote 0 - TxComment 1 - TxDeleteComment 17 - TxCommentOptions 19 - VOAuthorReward 49 + 2 - VOCommentReward 49 + 4 - VOEffectiveCommentVote 49 + 23
  // permlink
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_permlink ON hive.operations ((body::jsonb->'value'->>'permlink'))
    WHERE op_type_id = 0 OR op_type_id = 1 OR op_type_id = 17 OR op_type_id = 19 OR op_type_id = 49 + 2 OR op_type_id = 49 + 4 OR op_type_id = 49 + 23;`)
  console.log('Created 3 ot of ' + total + ' indexes...')

  // TxComment 1
  // parent_author - parent_permlink
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_parent_author ON hive.operations ((body::jsonb->'value'->>'parent_author')) WHERE op_type_id = 1;`)
  console.log('Created 4 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_parent_permlink ON hive.operations ((body::jsonb->'value'->>'parent_permlink')) WHERE op_type_id = 1;`)
  console.log('Created 5 ot of ' + total + ' indexes...')

  // TxTransfer 2 - TxTransferToVesting 3 - TxEscrowTransfer 27 - TxEscrowDispute 28 - TxEscrowRelease 29 - TxEscrowApprove 31 - TxTransferToSavings 32
  // TxTransferFromSavings 33 - TxCancelTransferFromSavings 34 - TxRecurrentTransfer 49 - VOFillTransferFromSavings 49 + 10 - VOFillRecurrentTransfer 49 + 34
  // from
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_from ON hive.operations ((body::jsonb->'value'->>'from'))
    WHERE op_type_id = 2 OR op_type_id = 3 OR op_type_id = 27 OR op_type_id = 28 OR op_type_id = 29 OR op_type_id = 31 OR op_type_id = 32 OR op_type_id = 33
    OR op_type_id = 34 OR op_type_id = 49 OR op_type_id = 49 + 10 OR op_type_id = 49 + 34;`)
  console.log('Created 6 ot of ' + total + ' indexes...')

  // TxTransfer 2 - TxTransferToVesting 3 - TxEscrowTransfer 27 - TxEscrowDispute 28 - TxEscrowRelease 29 - TxEscrowApprove 31 - TxTransferToSavings 32
  // TxTransferFromSavings 33 - TxRecurrentTransfer 49 - VOFillTransferFromSavings 49 + 10 - VOFillRecurrentTransfer 49 + 34
  // to
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_to ON hive.operations ((body::jsonb->'value'->>'to'))
    WHERE op_type_id = 2 OR op_type_id = 3 OR op_type_id = 27 OR op_type_id = 28 OR op_type_id = 29 OR op_type_id = 31 OR op_type_id = 32 OR op_type_id = 33
    OR op_type_id = 49 OR op_type_id = 49 + 10 OR op_type_id = 49 + 34;`)
  console.log('Created 7 ot of ' + total + ' indexes...')

  // TxTransfer 2 - TxTransferToSavings 32 - TxRecurrentTransfer 49 - VOFillRecurrentTransfer 49 + 34
  // memo
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_memo ON hive.operations ((body::jsonb->'value'->>'memo'))
    WHERE op_type_id = 2 OR op_type_id = 32 OR op_type_id = 49 OR op_type_id = 49 + 34;`)
  console.log('Created 8 ot of ' + total + ' indexes...')

  // TxWithdrawVesting 4 - TxAccountUpdate 10 - TxAccountWitnessVote 12 - TxAccountWitnessProxy 13 - TxClaimRewardBalance 39 - TxAccountUpdate2 43
  // VOReturnVestingDelegation 49 + 13 - VOChangedRecoveryAccount 49 + 27
  // account
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_account ON hive.operations ((body::jsonb->'value'->>'account'))
    WHERE op_type_id = 4 OR op_type_id = 10 OR op_type_id = 12 OR op_type_id = 13 OR op_type_id = 39 OR op_type_id = 43 OR op_type_id = 49 + 13 OR op_type_id = 49 + 27;`)
  console.log('Created 9 ot of ' + total + ' indexes...')

  // TxLimitOrderCreate 5 - TxLimitOrderCancel 6 - TxConvert 8 - TxWitnessUpdate 11 - TxLimitOrderCreate2 21 - TxWitnessSetProperties 42
  // TxCollateralizedConvert 48 - VOFillConvertRequest 49 + 1 - VOInterestOperation 49 + 6 - VOShutdownWitness 49 + 9
  // VOFillCollateralizedConvertRequest 49 + 32 - VOCollateralizedConvertImmediateConversion 49 + 39
  // owner
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_owner ON hive.operations ((body::jsonb->'value'->>'owner'))
    WHERE op_type_id = 5 OR op_type_id = 6 OR op_type_id = 8 OR op_type_id = 11 OR op_type_id = 21 OR op_type_id = 42 OR op_type_id = 48
    OR op_type_id = 49 + 1 OR op_type_id = 49 + 6 OR WHERE op_type_id = 49 + 9 OR op_type_id = 49 + 32 OR op_type_id = 49 + 39;`)
  console.log('Created 10 ot of ' + total + ' indexes...')

  // TxLimitOrderCreate 5 - TxLimitOrderCancel 6 - TxLimitOrderCreate2 21
  // orderid
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_orderid ON hive.operations ((body::jsonb->'value'->>'orderid'))
    WHERE op_type_id = 5 OR op_type_id = 6 OR op_type_id = 21;`)
  console.log('Created 11 ot of ' + total + ' indexes...')

  // TxFeedPublish 7
  // publisher
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_publisher ON hive.operations ((body::jsonb->'value'->>'publisher'))
    WHERE op_type_id = 7;`)
  console.log('Created 12 ot of ' + total + ' indexes...')

  // TxConvert 8 - TxCollateralizedConvert 48 - VOFillConvertRequest 49 + 1 - VOFillCollateralizedConvertRequest 49 + 32
  // VOCollateralizedConvertImmediateConversion 49 + 39
  // requestid
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_requestid ON hive.operations ((body::jsonb->'value'->>'requestid'))
    WHERE op_type_id = 8 OR op_type_id = 48 OR op_type_id = 49 + 1 OR op_type_id = 49 + 32 OR op_type_id = 49 + 39;`)
  console.log('Created 13 ot of ' + total + ' indexes...')

  // TxAccountCreate 9 - TxClaimAccount 22 - TxCreateClaimedAccount 23 - TxAccountCreateWithDelegation 41 - VOAccountCreated 49 + 31
  // creator
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_creator ON hive.operations ((body::jsonb->'value'->>'creator'))
    WHERE op_type_id = 9 OR op_type_id = 22 OR op_type_id = 23 OR op_type_id = 41 OR op_type_id = 49 + 31;`)
  console.log('Created 14 ot of ' + total + ' indexes...')

  // TxAccountCreate 9 - TxCreateClaimedAccount 23 - TxAccountCreateWithDelegation 41 - VOAccountCreated 49 + 31
  // new_account_name
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name'))
    WHERE op_type_id = 9 OR op_type_id = 23 OR op_type_id = 41 OR op_type_id = 49 + 31;`)
  console.log('Created 15 ot of ' + total + ' indexes...')

  // TxAccountWitnessVote 12
  // witness
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_witness ON hive.operations ((body::jsonb->'value'->>'witness'))
    WHERE op_type_id = 12;`)
  console.log('Created 16 ot of ' + total + ' indexes...')

  // TxAccountWitnessProxy 13
  // proxy
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_proxy ON hive.operations ((body::jsonb->'value'->>'proxy'))
    WHERE op_type_id = 13;`)
  console.log('Created 17 ot of ' + total + ' indexes...')

  // TxCustom 15 - TxCustomJson 18
  // id
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_id ON hive.operations ((body::jsonb->'value'->>'id'))
    WHERE op_type_id = 15 OR op_type_id = 18;`)
  console.log('Created 18 ot of ' + total + ' indexes...')

  // TxCustom 15 - TxCustomJson 18
  // required_auths
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_auths ON hive.operations ((body::jsonb->'value'->'required_auths'))
    WHERE op_type_id = 15 OR op_type_id = 18;`)
  console.log('Created 19 ot of ' + total + ' indexes...')

  // TxCustomJson 18
  // required_posting_auths
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_required_posting_auths ON hive.operations ((body::jsonb->'value'->'required_posting_auths'))
    WHERE op_type_id = 18;`)
  console.log('Created 20 ot of ' + total + ' indexes...')

  // TxSetWithdrawVestingRoute 20 - VOFillVestingWithdraw 49 + 7
  // from_account
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_from_account ON hive.operations ((body::jsonb->'value'->>'from_account'))
    WHERE op_type_id = 20 OR op_type_id = 49 + 7;`)
  console.log('Created 21 ot of ' + total + ' indexes...')
  
  // TxSetWithdrawVestingRoute 20 - VOFillVestingWithdraw 49 + 7
  // to_account
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_to_account ON hive.operations ((body::jsonb->'value'->>'to_account'))
    WHERE op_type_id = 20 OR op_type_id = 49 + 7;`)
  console.log('Created 22 ot of ' + total + ' indexes...')

  // TxChangeRecoveryAccount 26
  // account_to_recover - new_recovery_account
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover'))
    WHERE op_type_id = 26;`)
  console.log('Created 23 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_new_recovery_account ON hive.operations ((body::jsonb->'value'->>'new_recovery_account'))
    WHERE op_type_id = 26;`)
  console.log('Created 24 ot of ' + total + ' indexes...')

  // TxDelegateVestingShares 40
  // delegator - delegatee
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_delegator ON hive.operations ((body::jsonb->'value'->>'delegator'))
    WHERE op_type_id = 40;`)
  console.log('Created 25 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_delegatee ON hive.operations ((body::jsonb->'value'->>'delegatee'))
    WHERE op_type_id = 40;`)
  console.log('Created 26 ot of ' + total + ' indexes...')

  // TxUpdateProposalVotes 45
  // proposal_ids
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids'))
    WHERE op_type_id = 45;`)
  console.log('Created 27 ot of ' + total + ' indexes...')

  // VOCurationReward 49 + 3
  // curator
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_curator ON hive.operations ((body::jsonb->'value'->>'curator'))
    WHERE op_type_id = 49 + 3;`)
  console.log('Created 28 ot of ' + total + ' indexes...')

  // VOFillOrder 49 + 8
  // current_owner - current_orderid - open_owner - open_orderid
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_current_owner ON hive.operations ((body::jsonb->'value'->>'current_owner'))
    WHERE op_type_id = 49 + 8;`)
  console.log('Created 29 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_current_orderid ON hive.operations ((body::jsonb->'value'->>'current_orderid'))
    WHERE op_type_id = 49 + 8;`)
  console.log('Created 30 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_open_owner ON hive.operations ((body::jsonb->'value'->>'open_owner'))
    WHERE op_type_id = 49 + 8;`)
  console.log('Created 31 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_open_orderid ON hive.operations ((body::jsonb->'value'->>'open_orderid'))
    WHERE op_type_id = 49 + 8;`)
  console.log('Created 32 ot of ' + total + ' indexes...')

  // VOCommentBenefactorReward 49 + 14
  // benefactor
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_benefactor ON hive.operations ((body::jsonb->'value'->>'benefactor'))
    WHERE op_type_id = 49 + 14;`)
  console.log('Created 33 ot of ' + total + ' indexes...')

  // VOProducerReward 49 + 15
  // producer
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_producer ON hive.operations ((body::jsonb->'value'->>'producer'))
    WHERE op_type_id = 49 + 15;`)
  console.log('Created 34 ot of ' + total + ' indexes...')

  // VOProposalPay 49 + 17
  // proposal_id - receiver
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_proposal_id ON hive.operations ((body::jsonb->'value'->>'proposal_id'))
    WHERE op_type_id = 49 + 17;`)
  console.log('Created 35 ot of ' + total + ' indexes...')
  await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_operations_receiver ON hive.operations ((body::jsonb->'value'->>'receiver'))
    WHERE op_type_id = 49 + 17;`)
  console.log('Created 36 ot of ' + total + ' indexes...')

  console.log('Finished creating operation indexes. Now = ' + new Date(Date.now()).toISOString())
}

const main = async () => {
  await setupOperationIndexes()
  console.log('Draining the pool...')
  pool.end()
}

const gracefulShutdown = async () => {
  console.log('Shutting down...')
  console.log('Waiting for the last query to finish...')
  await pool.end()
  console.log('Postgresql pool drained.')
  process.exit()
}
process.on('SIGTERM', () => gracefulShutdown())
process.on('SIGINT', () => gracefulShutdown())

main()

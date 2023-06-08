import pg from 'pg'
import { config } from 'dotenv'
config()

// Indexes need haf_admin access
export const pool = new pg.Pool({
  application_name: 'HafSQL-indexes',
  database: process.env.PGDATABASE || 'haf_block_log',
  user: 'haf_admin',
  host: process.env.PGHOST || '172.17.0.2',
  port: process.env.PGPORT || 5432,
  max: process.env.PGPOOLSIZE || 2,
  min: 1
})

const CONCURRENTLY = process.env.CONCURRENTLY === 'false' ? '' : 'CONCURRENTLY'

const total = 85

// Needed for sorting by ID asc or desc
const setupHafIndexes = async () => {
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hive_operations_op_type_id_id_hafsql ON hive.operations (op_type_id, id DESC)`
  )
  console.log('Created ' + total + ' out of ' + total + ' indexes...')
}

export const setupOperationIndexes = async () => {
  // TxVote 0
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txvote_voter ON hive.operations ((body::jsonb->'value'->>'voter'), id DESC)
      WHERE op_type_id = 0;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txvote_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 0;`
  )

  console.log('Created 2 out of ' + total + ' indexes...')

  // TxComment 1
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcomment_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 1;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcomment_parent_author_parent_permlink ON hive.operations
      ((body::jsonb->'value'->>'parent_author'), (body::jsonb->'value'->>'parent_permlink'), id DESC) WHERE op_type_id = 1;`
  )

  console.log('Created 4 out of ' + total + ' indexes...')

  // TxTransfer 2
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfer_from ON hive.operations ((body::jsonb->'value'->>'from'), id DESC) WHERE op_type_id = 2;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfer_to ON hive.operations ((body::jsonb->'value'->>'to'), id DESC) WHERE op_type_id = 2;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo'), id DESC) WHERE op_type_id = 2;`
  )

  console.log('Created 7 out of ' + total + ' indexes...')

  // TxTransferToVesting 3
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfertovesting_from ON hive.operations ((body::jsonb->'value'->>'from'), id DESC) WHERE op_type_id = 3;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfertovesting_to ON hive.operations ((body::jsonb->'value'->>'to'), id DESC) WHERE op_type_id = 3;`
  )

  console.log('Created 9 out of ' + total + ' indexes...')

  // TxWithdrawVesting 4
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txwithdrawvesting_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC) WHERE op_type_id = 4;`
  )

  console.log('Created 10 out of ' + total + ' indexes...')

  // TxLimitOrderCreate 5
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txlimitordercreate_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC) WHERE op_type_id = 5;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txlimitordercreate_orderid ON hive.operations ((body::jsonb->'value'->>'orderid'), id DESC) WHERE op_type_id = 5;`
  )

  console.log('Created 12 out of ' + total + ' indexes...')

  // TxLimitOrderCancel 6
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txlimitordercancel_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC) WHERE op_type_id = 6;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txlimitordercancel_orderid ON hive.operations ((body::jsonb->'value'->>'orderid'), id DESC) WHERE op_type_id = 6;`
  )

  console.log('Created 14 out of ' + total + ' indexes...')

  // TxFeedPublish 7
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txfeedpublish_publisher ON hive.operations ((body::jsonb->'value'->>'publisher'), id DESC) WHERE op_type_id = 7;`
  )

  console.log('Created 15 out of ' + total + ' indexes...')

  // TxConvert 8
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txconvert_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC) WHERE op_type_id = 8;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txconvert_requestid ON hive.operations ((body::jsonb->'value'->>'requestid'), id DESC) WHERE op_type_id = 8;`
  )

  console.log('Created 17 out of ' + total + ' indexes...')

  // TxAccountCreate 9
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountcreate_creator ON hive.operations ((body::jsonb->'value'->>'creator'), id DESC) WHERE op_type_id = 9;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountcreate_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name'), id DESC) WHERE op_type_id = 9;`
  )

  console.log('Created 19 out of ' + total + ' indexes...')

  // TxAccountUpdate 10
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountupdate_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC) WHERE op_type_id = 10;`
  )

  console.log('Created 20 out of ' + total + ' indexes...')

  // TxWitnessUpdate 11
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txwitnessupdate_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC) WHERE op_type_id = 11;`
  )

  console.log('Created 21 out of ' + total + ' indexes...')

  // TxAccountWitnessVote 12
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountwitnessvote_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC) WHERE op_type_id = 12;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountwitnessvote_witness ON hive.operations ((body::jsonb->'value'->>'witness'), id DESC) WHERE op_type_id = 12;`
  )

  console.log('Created 23 out of ' + total + ' indexes...')

  // TxAccountWitnessProxy 13
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountwitnessproxy_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC) WHERE op_type_id = 13;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountwitnessproxy_proxy ON hive.operations ((body::jsonb->'value'->>'proxy'), id DESC) WHERE op_type_id = 13;`
  )

  console.log('Created 25 out of ' + total + ' indexes...')

  // TxPow 14
  // TxCustom 15
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcustom_id ON hive.operations ((body::jsonb->'value'->>'id'), id DESC) WHERE op_type_id = 15;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcustom_required_auths ON hive.operations ((body::jsonb->'value'->'required_auths'), id DESC) WHERE op_type_id = 15;`
  )

  console.log('Created 27 out of ' + total + ' indexes...')

  // witness_block_approve 16
  // TxDeleteComment 17
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txdeletecomment_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 17;`
  )

  console.log('Created 28 out of ' + total + ' indexes...')

  // TxCustomJson 18
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcustomjson_id_id ON hive.operations ((body::jsonb->'value'->>'id'), id DESC) WHERE op_type_id = 18;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcustomjson_required_auths ON hive.operations ((body::jsonb->'value'->'required_auths'), id DESC) WHERE op_type_id = 18;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcustomjson_required_posting_auths ON hive.operations ((body::jsonb->'value'->'required_posting_auths'), id DESC) WHERE op_type_id = 18;`
  )

  console.log('Created 31 out of ' + total + ' indexes...')

  // TxCommentOptions 19
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcommentoptions_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 19;`
  )

  console.log('Created 32 out of ' + total + ' indexes...')

  // TxSetWithdrawVestingRoute 20
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txsetwithdrawvestingroute_from_account ON hive.operations ((body::jsonb->'value'->>'from_account'), id DESC) WHERE op_type_id = 20;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txsetwithdrawvestingroute_to_account ON hive.operations ((body::jsonb->'value'->>'to_account'), id DESC) WHERE op_type_id = 20;`
  )

  console.log('Created 34 out of ' + total + ' indexes...')

  // TxLimitOrderCreate2 21
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txlimitordercreate2_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC) WHERE op_type_id = 21;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txlimitordercreate2_orderid ON hive.operations ((body::jsonb->'value'->>'orderid'), id DESC) WHERE op_type_id = 21;`
  )

  console.log('Created 36 out of ' + total + ' indexes...')

  // TxClaimAccount 22
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txclaimaccount_creator ON hive.operations ((body::jsonb->'value'->>'creator'), id DESC) WHERE op_type_id = 22;`
  )

  console.log('Created 37 out of ' + total + ' indexes...')

  // TxCreateClaimedAccount 23
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcreateclaimedaccount_creator ON hive.operations ((body::jsonb->'value'->>'creator'), id DESC) WHERE op_type_id = 23;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcreateclaimedaccount_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name'), id DESC)
      WHERE op_type_id = 23;`
  )

  console.log('Created 39 out of ' + total + ' indexes...')

  // TxRequestAccountRecovery 24
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txrequestaccountrecovery_recovery_account ON hive.operations ((body::jsonb->'value'->>'recovery_account')) WHERE op_type_id = 24;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txrequestaccountrecovery_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 24;`)

  // TxRecoverAccount 25
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txrecoveraccount_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 25;`)

  // TxChangeRecoveryAccount 26
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txchangerecoveryaccount_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover'), id DESC)
      WHERE op_type_id = 26;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txchangerecoveryaccount_new_recovery_account ON hive.operations ((body::jsonb->'value'->>'new_recovery_account'), id DESC)
      WHERE op_type_id = 26;`
  )

  console.log('Created 41 out of ' + total + ' indexes...')

  // TxEscrowTransfer 27
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowtransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 27;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowtransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 27;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowtransfer_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 27;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowtransfer_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 27;`)

  // TxEscrowDispute 28
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowdispute_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 28;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowdispute_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 28;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowdispute_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 28;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowdispute_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 28;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowdispute_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 28;`)

  // TxEscrowRelease 29
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowrelease_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 29;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowrelease_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 29;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowrelease_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 29;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowrelease_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 29;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowrelease_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 29;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowrelease_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 29;`)

  // TxPow2 30
  // TxEscrowApprove 31
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowapprove_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 31;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowapprove_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 31;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowapprove_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 31;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowapprove_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 31;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txescrowapprove_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 31;`)

  // TxTransferToSavings 32
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfertosavings_from ON hive.operations ((body::jsonb->'value'->>'from'), id DESC) WHERE op_type_id = 32;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfertosavings_to ON hive.operations ((body::jsonb->'value'->>'to'), id DESC) WHERE op_type_id = 32;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransfertosavings_memo ON hive.operations ((body::jsonb->'value'->>'memo'), id DESC) WHERE op_type_id = 32;`
  )

  console.log('Created 44 out of ' + total + ' indexes...')

  // TxTransferFromSavings 33
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from'), id DESC) WHERE op_type_id = 33;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txtransferfromsavings_to ON hive.operations ((body::jsonb->'value'->>'to'), id DESC) WHERE op_type_id = 33;`
  )

  console.log('Created 46 out of ' + total + ' indexes...')

  // TxCancelTransferFromSavings 34
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcanceltransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from'), id DESC) WHERE op_type_id = 34;`
  )

  console.log('Created 47 out of ' + total + ' indexes...')

  // TxCustomBinary 35
  // TxDeclineVotingRights 36
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txdeclinevotingrights_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 36;`)

  // reset_account 37
  // set_reset_account 38
  // TxClaimRewardBalance 39
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txclaimrewardbalance_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC)
      WHERE op_type_id = 39;`
  )

  console.log('Created 48 out of ' + total + ' indexes...')

  // TxDelegateVestingShares 40
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txdelegatevestingshares_delegator_id ON hive.operations ((body::jsonb->'value'->>'delegator'), id DESC)
      WHERE op_type_id = 40;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txdelegatevestingshares_delegatee ON hive.operations ((body::jsonb->'value'->>'delegatee'), id DESC)
      WHERE op_type_id = 40;`
  )

  console.log('Created 50 out of ' + total + ' indexes...')

  // TxAccountCreateWithDelegation 41
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountcreatewithdelegation_creator ON hive.operations ((body::jsonb->'value'->>'creator'), id DESC)
      WHERE op_type_id = 41;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountcreatewithdelegation_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name'), id DESC)
      WHERE op_type_id = 41;`
  )

  console.log('Created 52 out of ' + total + ' indexes...')

  // TxWitnessSetProperties 42
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txwitnesssetproperties_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC)
      WHERE op_type_id = 42;`
  )

  console.log('Created 53 out of ' + total + ' indexes...')

  // TxAccountUpdate2 43
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txaccountupdate2_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC)
      WHERE op_type_id = 43;`
  )

  console.log('Created 54 out of ' + total + ' indexes...')

  // TxCreateProposal 44
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcreateproposal_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 44;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcreateproposal_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 44;`)

  // TxUpdateProposalVotes 45
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txupdateproposalvotes_voter ON hive.operations ((body::jsonb->'value'->>'voter'), id DESC)
      WHERE op_type_id = 45;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txupdateproposalvotes_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids'), id DESC)
      WHERE op_type_id = 45;`
  )

  console.log('Created 56 out of ' + total + ' indexes...')

  // TxRemoveProposal 46
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txremoveproposal_proposal_owner ON hive.operations ((body::jsonb->'value'->>'proposal_owner')) WHERE op_type_id = 46;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txremoveproposal_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids')) WHERE op_type_id = 46;`)

  // TxUpdateProposal 47
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txupdateproposal_proposal_id ON hive.operations ((body::jsonb->'value'->>'proposal_id')) WHERE op_type_id = 47;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txupdateproposal_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 47;`)

  // TxCollateralizedConvert 48
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcollateralizedconvert_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC)
      WHERE op_type_id = 48;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txcollateralizedconvert_requestid ON hive.operations ((body::jsonb->'value'->>'requestid'), id DESC)
      WHERE op_type_id = 48;`
  )

  console.log('Created 58 out of ' + total + ' indexes...')

  // too small for now
  // TxRecurrentTransfer 49
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txrecurrenttransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 49;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txrecurrenttransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 49;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_txrecurrenttransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 49;`)
}

export const setupVirtualOperationIndexes = async () => {
  // VOFillConvertRequest 49 + 1
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillconvertrequest_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC)
      WHERE op_type_id = 49 + 1;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillconvertrequest_requestid ON hive.operations ((body::jsonb->'value'->>'requestid'), id DESC)
      WHERE op_type_id = 49 + 1;`
  )

  console.log('Created 60 out of ' + total + ' indexes...')

  // VOAuthorReward 49 + 2
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voauthorreward_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 49 + 2;`
  )

  console.log('Created 61 out of ' + total + ' indexes...')

  // VOCurationReward 49 + 3
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vocurationreward_curator ON hive.operations ((body::jsonb->'value'->>'curator'), id DESC)
      WHERE op_type_id = 49 + 3;`
  )

  console.log('Created 62 out of ' + total + ' indexes...')

  // VOCommentReward 49 + 4
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vocommentreward_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 49 + 4;`
  )

  console.log('Created 63 out of ' + total + ' indexes...')

  // VOLiquidityReward 49 + 5
  // VOInterestOperation 49 + 6
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vointerestoperation_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC)
      WHERE op_type_id = 49 + 6;`
  )

  console.log('Created 64 out of ' + total + ' indexes...')

  // VOFillVestingWithdraw 49 + 7
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillvestingwithdraw_from_account ON hive.operations ((body::jsonb->'value'->>'from_account'), id DESC)
      WHERE op_type_id = 49 + 7;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillvestingwithdraw_to_account ON hive.operations ((body::jsonb->'value'->>'to_account'), id DESC)
      WHERE op_type_id = 49 + 7;`
  )

  console.log('Created 65 out of ' + total + ' indexes...')

  // VOFillOrder 49 + 8
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillorder_current_owner ON hive.operations ((body::jsonb->'value'->>'current_owner'), id DESC)
      WHERE op_type_id = 49 + 8;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillorder_current_orderid ON hive.operations ((body::jsonb->'value'->>'current_orderid'), id DESC)
      WHERE op_type_id = 49 + 8;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillorder_open_owner ON hive.operations ((body::jsonb->'value'->>'open_owner'), id DESC)
      WHERE op_type_id = 49 + 8;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillorder_open_orderid ON hive.operations ((body::jsonb->'value'->>'open_orderid'), id DESC)
      WHERE op_type_id = 49 + 8;`
  )

  console.log('Created 69 out of ' + total + ' indexes...')

  // VOShutdownWitness 49 + 9
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voshutdownwitness_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 49 + 9;`)

  // VOFillTransferFromSavings 49 + 10
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofilltransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from'), id DESC)
      WHERE op_type_id = 49 + 10;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofilltransferfromsavings_to ON hive.operations ((body::jsonb->'value'->>'to'), id DESC)
      WHERE op_type_id = 49 + 10;`
  )

  console.log('Created 71 out of ' + total + ' indexes...')

  // VOHardfork 49 + 11
  // VOCommentPayoutUpdate 49 + 12
  // VOReturnVestingDelegation 49 + 13
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voreturnvestingdelegation_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC)
      WHERE op_type_id = 49 + 13;`
  )

  console.log('Created 72 out of ' + total + ' indexes...')

  // VOCommentBenefactorReward 49 + 14
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vocommentbenefactorreward_benefactor ON hive.operations ((body::jsonb->'value'->>'benefactor'), id DESC)
      WHERE op_type_id = 49 + 14;`
  )

  console.log('Created 73 out of ' + total + ' indexes...')

  // VOProducerReward 49 + 15
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voproducerreward_producer ON hive.operations ((body::jsonb->'value'->>'producer'), id DESC)
      WHERE op_type_id = 49 + 15;`
  )

  console.log('Created 74 out of ' + total + ' indexes...')

  // VOClearNullAccountBalance 49 + 16
  // VOProposalPay 49 + 17
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voproposalpay_proposal_id ON hive.operations ((body::jsonb->'value'->>'proposal_id'), id DESC)
      WHERE op_type_id = 49 + 17;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voproposalpay_receiver ON hive.operations ((body::jsonb->'value'->>'receiver'), id DESC)
      WHERE op_type_id = 49 + 17;`
  )

  console.log('Created 76 out of ' + total + ' indexes...')

  // VODHFFunding 49 + 18
  // VOHardforkHive 49 + 19
  // VOHardforkHiveRestore 49 + 20
  // VODelayedVoting 49 + 21
  // VOConsolidateTreasuryBalance 49 + 22
  // VOEffectiveCommentVote 49 + 23
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voeffectivecommentvote_author_permlink ON hive.operations
      ((body::jsonb->'value'->>'author'), (body::jsonb->'value'->>'permlink'), id DESC) WHERE op_type_id = 49 + 23;`
  )

  console.log('Created 77 out of ' + total + ' indexes...')

  // VOIneffectiveDeleteComment 49 + 24
  // VODHFConversion 49 + 25
  // VOExpiredAccountNotification 49 + 26
  // VOChangedRecoveryAccount 49 + 27
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vochangedrecoveryaccount_account ON hive.operations ((body::jsonb->'value'->>'account'), id DESC)
      WHERE op_type_id = 49 + 27;`
  )

  console.log('Created 78 out of ' + total + ' indexes...')

  // VOTransferToVestingCompleted 49 + 28
  // VOPowReward 49 + 29
  // VOVestingSharesSplit 49 + 30
  // VOAccountCreated 49 + 31
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voaccountcreated_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name'), id DESC)
      WHERE op_type_id = 49 + 31;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_voaccountcreated_creator ON hive.operations ((body::jsonb->'value'->>'creator'), id DESC)
      WHERE op_type_id = 49 + 31;`
  )

  console.log('Created 80 out of ' + total + ' indexes...')

  // VOFillCollateralizedConvertRequest 49 + 32
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillcollateralizedconvertrequest_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC)
      WHERE op_type_id = 49 + 32;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillcollateralizedconvertrequest_requestid ON hive.operations ((body::jsonb->'value'->>'requestid'), id DESC)
      WHERE op_type_id = 49 + 32;`
  )

  console.log('Created 82 out of ' + total + ' indexes...')

  // VOSystemWarningOperation 49 + 33
  // VOFillRecurrentTransfer 49 + 34
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillrecurrenttransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 49 + 34;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillrecurrenttransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 49 + 34;`)
  // await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vofillrecurrenttransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 49 + 34;`)

  // VOFailedRecurrentTransfer 49 + 35
  // VOLimitOrderCancelled 49 + 36
  // VOProducerMissed 49 + 37
  // VOProposalFee 49 + 38
  // VOCollateralizedConvertImmediateConversion 49 + 39
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vocollateralizedconvertimmediateconversion_owner ON hive.operations ((body::jsonb->'value'->>'owner'), id DESC)
      WHERE op_type_id = 49 + 39;`
  )
  await pool.query(
    `CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_vocollateralizedconvertimmediateconversion_requestid ON hive.operations ((body::jsonb->'value'->>'requestid'), id DESC)
      WHERE op_type_id = 49 + 39;`
  )

  console.log('Created 84 out of ' + total + ' indexes...')

  // VOEscrowApproved 49 + 40
  // VOEscrowRejected 49 + 41
  // VOProxyCleared 49 + 42
}

// const extraIndexes = async () => {
//   await pool.query(`CREATE INDEX ${CONCURRENTLY} IF NOT EXISTS hafsql_delegations_delegator_op_id ON hive.operations ((body::jsonb->'value'->>'delegator'), id) WHERE op_type_id = 40;`)
// }

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

import pg from 'pg'
import { config } from 'dotenv'
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

const dropOperationIndexes = async () => {
  await pool.query(`DROP INDEX IF EXISTS
  hive.hive_operations_op_type_id_id_hafsql,
  hive.hafsql_txvote_voter,
  hive.hafsql_txvote_author_permlink,
  hive.hafsql_txcomment_author_permlink,
  hive.hafsql_txcomment_parent_author_parent_permlink,
  hive.hafsql_txtransfer_from,
  hive.hafsql_txtransfer_to,
  hive.hafsql_txtransfer_memo,
  hive.hafsql_txtransfertovesting_from,
  hive.hafsql_txtransfertovesting_to,
  hive.hafsql_txwithdrawvesting_account,
  hive.hafsql_txlimitordercreate_owner,
  hive.hafsql_txlimitordercreate_orderid,
  hive.hafsql_txlimitordercancel_owner,
  hive.hafsql_txlimitordercancel_orderid,
  hive.hafsql_txfeedpublish_publisher,
  hive.hafsql_txconvert_owner,
  hive.hafsql_txconvert_requestid,
  hive.hafsql_txaccountcreate_creator,
  hive.hafsql_txaccountcreate_new_account_name,
  hive.hafsql_txaccountupdate_account,
  hive.hafsql_txwitnessupdate_owner,
  hive.hafsql_txaccountwitnessvote_account,
  hive.hafsql_txaccountwitnessvote_witness,
  hive.hafsql_txaccountwitnessproxy_account,
  hive.hafsql_txaccountwitnessproxy_proxy,
  hive.hafsql_txcustom_id,
  hive.hafsql_txcustom_required_auths,
  hive.hafsql_txdeletecomment_author_permlink,
  hive.hafsql_txcustomjson_id_id,
  hive.hafsql_txcustomjson_required_auths,
  hive.hafsql_txcustomjson_required_posting_auths,
  hive.hafsql_txcommentoptions_author_permlink,
  hive.hafsql_txsetwithdrawvestingroute_from_account,
  hive.hafsql_txsetwithdrawvestingroute_to_account,
  hive.hafsql_txlimitordercreate2_owner,
  hive.hafsql_txlimitordercreate2_orderid,
  hive.hafsql_txclaimaccount_creator,
  hive.hafsql_txcreateclaimedaccount_creator,
  hive.hafsql_txcreateclaimedaccount_new_account_name,
  hive.hafsql_txchangerecoveryaccount_account_to_recover,
  hive.hafsql_txchangerecoveryaccount_new_recovery_account,
  hive.hafsql_txtransfertosavings_from,
  hive.hafsql_txtransfertosavings_to,
  hive.hafsql_txtransfertosavings_memo,
  hive.hafsql_txtransferfromsavings_from,
  hive.hafsql_txtransferfromsavings_to,
  hive.hafsql_txcanceltransferfromsavings_from,
  hive.hafsql_txclaimrewardbalance_account,
  hive.hafsql_txdelegatevestingshares_delegator_id,
  hive.hafsql_txdelegatevestingshares_delegatee,
  hive.hafsql_txaccountcreatewithdelegation_creator,
  hive.hafsql_txaccountcreatewithdelegation_new_account_name,
  hive.hafsql_txwitnesssetproperties_owner,
  hive.hafsql_txaccountupdate2_account,
  hive.hafsql_txupdateproposalvotes_voter,
  hive.hafsql_txupdateproposalvotes_proposal_ids,
  hive.hafsql_txcollateralizedconvert_owner,
  hive.hafsql_txcollateralizedconvert_requestid;`)
}

const dropVirtualOperationIndexes = async () => {
  await pool.query(`DROP INDEX IF EXISTS
  hive.hafsql_vofillconvertrequest_owner,
  hive.hafsql_vofillconvertrequest_requestid,
  hive.hafsql_voauthorreward_author_permlink,
  hive.hafsql_vocurationreward_curator,
  hive.hafsql_vocommentreward_author_permlink,
  hive.hafsql_vointerestoperation_owner,
  hive.hafsql_vofillvestingwithdraw_from_account,
  hive.hafsql_vofillvestingwithdraw_to_account,
  hive.hafsql_vofillorder_current_owner,
  hive.hafsql_vofillorder_current_orderid,
  hive.hafsql_vofillorder_open_owner,
  hive.hafsql_vofillorder_open_orderid,
  hive.hafsql_vofilltransferfromsavings_from,
  hive.hafsql_vofilltransferfromsavings_to,
  hive.hafsql_voreturnvestingdelegation_account,
  hive.hafsql_vocommentbenefactorreward_benefactor,
  hive.hafsql_voproducerreward_producer,
  hive.hafsql_voproposalpay_proposal_id,
  hive.hafsql_voproposalpay_receiver,
  hive.hafsql_voeffectivecommentvote_author_permlink,
  hive.hafsql_vochangedrecoveryaccount_account,
  hive.hafsql_voaccountcreated_new_account_name,
  hive.hafsql_voaccountcreated_creator,
  hive.hafsql_vofillcollateralizedconvertrequest_owner,
  hive.hafsql_vofillcollateralizedconvertrequest_requestid,
  hive.hafsql_vocollateralizedconvertimmediateconversion_owner,
  hive.hafsql_vocollateralizedconvertimmediateconversion_requestid;`)
}

const main = async () => {
  console.log('Dropping indexes...')
  await dropOperationIndexes()
  await dropVirtualOperationIndexes()
  console.log('Done.')
  pool.end()
}

main()

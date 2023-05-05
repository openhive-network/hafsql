DO $$
BEGIN
  RAISE NOTICE 'Creating indexes CONCURRENTLY. This will take a long time. Starting at %', NOW();
END; $$;

-- TxVote 0
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txvote_voter ON hive.operations ((body::jsonb->'value'->>'voter')) WHERE op_type_id = 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txvote_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txvote_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 0;

-- TxComment 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcomment_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 1;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcomment_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 1;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcomment_parent_author ON hive.operations ((body::jsonb->'value'->>'parent_author')) WHERE op_type_id = 1;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcomment_parent_permlink ON hive.operations ((body::jsonb->'value'->>'parent_permlink')) WHERE op_type_id = 1;

-- TxTransfer 2
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 2;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 2;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 2;

-- TxTransferToVesting 3
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfertovesting_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 3;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfertovesting_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 3;

-- TxWithdrawVesting 4
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txwithdrawvesting_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 4;

-- TxLimitOrderCreate 5
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txlimitordercreate_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 5;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txlimitordercreate_orderid ON hive.operations ((body::jsonb->'value'->>'orderid')) WHERE op_type_id = 5;

-- TxLimitOrderCancel 6
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txlimitordercancel_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 6;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txlimitordercancel_orderid ON hive.operations ((body::jsonb->'value'->>'orderid')) WHERE op_type_id = 6;

-- TxFeedPublish 7
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txfeedpublish_publisher ON hive.operations ((body::jsonb->'value'->>'publisher')) WHERE op_type_id = 7;

-- TxConvert 8
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txconvert_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 8;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txconvert_requestid ON hive.operations ((body::jsonb->'value'->>'requestid')) WHERE op_type_id = 8;

-- TxAccountCreate 9
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountcreate_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 9;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountcreate_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name')) WHERE op_type_id = 9;

-- TxAccountUpdate 10
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountupdate_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 10;

-- TxWitnessUpdate 11
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txwitnessupdate_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 11;

-- TxAccountWitnessVote 12
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountwitnessvote_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 12;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountwitnessvote_witness ON hive.operations ((body::jsonb->'value'->>'witness')) WHERE op_type_id = 12;

-- TxAccountWitnessProxy 13
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountwitnessproxy_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 13;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountwitnessproxy_proxy ON hive.operations ((body::jsonb->'value'->>'proxy')) WHERE op_type_id = 13;

-- TxPow 14

-- TxCustom 15
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcustom_id ON hive.operations ((body::jsonb->'value'->>'id')) WHERE op_type_id = 15;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcustom_required_auths ON hive.operations ((body::jsonb->'value'->'required_auths')) WHERE op_type_id = 15;

-- witness_block_approve 16

-- TxDeleteComment 17
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txdeletecomment_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 17;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txdeletecomment_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 17;

-- TxCustomJson 18
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcustomjson_id ON hive.operations ((body::jsonb->'value'->>'id')) WHERE op_type_id = 18;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcustomjson_required_auths ON hive.operations ((body::jsonb->'value'->'required_auths')) WHERE op_type_id = 18;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcustomjson_required_posting_auths ON hive.operations ((body::jsonb->'value'->'required_posting_auths')) WHERE op_type_id = 18;

-- TxCommentOptions 19
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcommentoptions_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 19;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcommentoptions_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 19;

-- TxSetWithdrawVestingRoute 20
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txsetwithdrawvestingroute_from_account ON hive.operations ((body::jsonb->'value'->>'from_account')) WHERE op_type_id = 20;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txsetwithdrawvestingroute_to_account ON hive.operations ((body::jsonb->'value'->>'to_account')) WHERE op_type_id = 20;

-- TxLimitOrderCreate2 21
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txlimitordercreate2_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 21;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txlimitordercreate2_orderid ON hive.operations ((body::jsonb->'value'->>'orderid')) WHERE op_type_id = 21;

-- TxClaimAccount 22
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txclaimaccount_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 22;

-- TxCreateClaimedAccount 23
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcreateclaimedaccount_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 23;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcreateclaimedaccount_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name')) WHERE op_type_id = 23;

-- TxRequestAccountRecovery 24
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txrequestaccountrecovery_recovery_account ON hive.operations ((body::jsonb->'value'->>'recovery_account')) WHERE op_type_id = 24;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txrequestaccountrecovery_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 24;

-- TxRecoverAccount 25
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txrecoveraccount_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 25;

-- TxChangeRecoveryAccount 26
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txchangerecoveryaccount_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 26;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txchangerecoveryaccount_new_recovery_account ON hive.operations ((body::jsonb->'value'->>'new_recovery_account')) WHERE op_type_id = 26;

-- TxEscrowTransfer 27
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowtransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 27;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowtransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 27;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowtransfer_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 27;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowtransfer_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 27;

-- TxEscrowDispute 28
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowdispute_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowdispute_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowdispute_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowdispute_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowdispute_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 28;

-- TxEscrowRelease 29
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowrelease_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowrelease_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowrelease_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowrelease_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowrelease_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowrelease_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 29;

-- TxPow2 30

-- TxEscrowApprove 31
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowapprove_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowapprove_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowapprove_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowapprove_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txescrowapprove_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 31;

-- TxTransferToSavings 32
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfertosavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 32;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfertosavings_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 32;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransfertosavings_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 32;

-- TxTransferFromSavings 33
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 33;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransferfromsavings_request_id ON hive.operations ((body::jsonb->'value'->>'request_id')) WHERE op_type_id = 33;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransferfromsavings_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 33;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txtransferfromsavings_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 33;

-- TxCancelTransferFromSavings
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcanceltransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 34;

-- TxCustomBinary 35

-- TxDeclineVotingRights 36
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txdeclinevotingrights_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 36;

-- reset_account 37
-- set_reset_account 38

-- TxClaimRewardBalance 39
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txclaimrewardbalance_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 39;

-- TxDelegateVestingShares 40
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txdelegatevestingshares_delegator ON hive.operations ((body::jsonb->'value'->>'delegator')) WHERE op_type_id = 40;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txdelegatevestingshares_delegatee ON hive.operations ((body::jsonb->'value'->>'delegatee')) WHERE op_type_id = 40;

-- TxAccountCreateWithDelegation 41
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountcreatewithdelegation_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 41;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountcreatewithdelegation_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name')) WHERE op_type_id = 41;

-- TxWitnessSetProperties 42
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txwitnesssetproperties_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 42;

-- TxAccountUpdate2 43
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txaccountupdate2_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 43;

-- TxCreateProposal 44
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcreateproposal_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 44;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcreateproposal_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 44;

-- TxUpdateProposalVotes 45
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txupdateproposalvotes_voter ON hive.operations ((body::jsonb->'value'->>'voter')) WHERE op_type_id = 45;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txupdateproposalvotes_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids')) WHERE op_type_id = 45;

-- TxRemoveProposal 46
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txremoveproposal_proposal_owner ON hive.operations ((body::jsonb->'value'->>'proposal_owner')) WHERE op_type_id = 46;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txremoveproposal_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids')) WHERE op_type_id = 46;

-- TxUpdateProposal 47
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txupdateproposal_proposal_id ON hive.operations ((body::jsonb->'value'->>'proposal_id')) WHERE op_type_id = 47;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txupdateproposal_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 47;

-- TxCollateralizedConvert 48
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcollateralizedconvert_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 48;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txcollateralizedconvert_requestid ON hive.operations ((body::jsonb->'value'->>'requestid')) WHERE op_type_id = 48;

-- TxRecurrentTransfer 49
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txrecurrenttransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 49;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txrecurrenttransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 49;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_txrecurrenttransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 49;


-- Virtual Operations
-- op_type_id = op_type_id of last non-virtual operation + i (i = 1; i++ for the next VOps)
-- MUST be adjusted after addition of new operations likely after a HF

-- VOFillConvertRequest 49 + 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillconvertrequest_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 49 + 1;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillconvertrequest_requestid ON hive.operations ((body::jsonb->'value'->>'requestid')) WHERE op_type_id = 49 + 1;

-- VOAuthorReward 49 + 2
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voauthorreward_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 49 + 2;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voauthorreward_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 49 + 2;

-- VOCurationReward 49 + 3
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocurationreward_curator ON hive.operations ((body::jsonb->'value'->>'curator')) WHERE op_type_id = 49 + 3;

-- VOCommentReward 49 + 4
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocommentreward_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 49 + 4;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocommentreward_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 49 + 4;

-- VOLiquidityReward 49 + 5

-- VOInterestOperation 49 + 6
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vointerestoperation_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 49 + 6;

-- VOFillVestingWithdraw 49 + 7
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillvestingwithdraw_from_account ON hive.operations ((body::jsonb->'value'->>'from_account')) WHERE op_type_id = 49 + 7;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillvestingwithdraw_to_account ON hive.operations ((body::jsonb->'value'->>'to_account')) WHERE op_type_id = 49 + 7;

-- VOFillOrder 49 + 8
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillorder_current_owner ON hive.operations ((body::jsonb->'value'->>'current_owner')) WHERE op_type_id = 49 + 8;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillorder_current_orderid ON hive.operations ((body::jsonb->'value'->>'current_orderid')) WHERE op_type_id = 49 + 8;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillorder_open_owner ON hive.operations ((body::jsonb->'value'->>'open_owner')) WHERE op_type_id = 49 + 8;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillorder_open_orderid ON hive.operations ((body::jsonb->'value'->>'open_orderid')) WHERE op_type_id = 49 + 8;

-- VOShutdownWitness 49 + 9
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voshutdownwitness_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 49 + 9;

-- VOFillTransferFromSavings 49 + 10
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofilltransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 49 + 10;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofilltransferfromsavings_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 49 + 10;

-- VOHardfork 49 + 11

-- VOCommentPayoutUpdate 49 + 12

-- VOReturnVestingDelegation 49 + 13
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voreturnvestingdelegation_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 49 + 13;

-- VOCommentBenefactorReward 49 + 14
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocommentbenefactorreward_benefactor ON hive.operations ((body::jsonb->'value'->>'benefactor')) WHERE op_type_id = 49 + 14;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocommentbenefactorreward_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 49 + 14;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocommentbenefactorreward_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 49 + 14;

-- VOProducerReward 49 + 15
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voproducerreward_producer ON hive.operations ((body::jsonb->'value'->>'producer')) WHERE op_type_id = 49 + 15;

-- VOClearNullAccountBalance 49 + 16

-- VOProposalPay 49 + 17
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voproposalpay_proposal_id ON hive.operations ((body::jsonb->'value'->>'proposal_id')) WHERE op_type_id = 49 + 17;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voproposalpay_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 49 + 17;

-- VODHFFunding 49 + 18

-- VOHardforkHive 49 + 19

-- VOHardforkHiveRestore 49 + 20

-- VODelayedVoting 49 + 21

-- VOConsolidateTreasuryBalance 49 + 22

-- VOEffectiveCommentVote 49 + 23
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voeffectivecommentvote_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 49 + 23;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voeffectivecommentvote_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 49 + 23;

-- VOIneffectiveDeleteComment 49 + 24

-- VODHFConversion 49 + 25

-- VOExpiredAccountNotification 49 + 26

-- VOChangedRecoveryAccount 49 + 27
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vochangedrecoveryaccount_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 49 + 27;

-- VOTransferToVestingCompleted 49 + 28

-- VOPowReward 49 + 29

-- VOVestingSharesSplit 49 + 30

-- VOAccountCreated 49 + 31
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voaccountcreated_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name')) WHERE op_type_id = 49 + 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_voaccountcreated_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 49 + 31;

-- VOFillCollateralizedConvertRequest 49 + 32
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillcollateralizedconvertrequest_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 49 + 32;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillcollateralizedconvertrequest_requestid ON hive.operations ((body::jsonb->'value'->>'requestid')) WHERE op_type_id = 49 + 32;

-- VOSystemWarningOperation 49 + 33

-- VOFillRecurrentTransfer 49 + 34
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillrecurrenttransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 49 + 34;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillrecurrenttransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 49 + 34;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vofillrecurrenttransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 49 + 34;

-- VOFailedRecurrentTransfer 49 + 35

-- VOLimitOrderCancelled 49 + 36

-- VOProducerMissed 49 + 37

-- VOProposalFee 49 + 38

-- VOCollateralizedConvertImmediateConversion 49 + 39
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocollateralizedconvertimmediateconversion_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 49 + 39;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_vocollateralizedconvertimmediateconversion_requestid ON hive.operations ((body::jsonb->'value'->>'requestid')) WHERE op_type_id = 49 + 39;

-- VOEscrowApproved 49 + 40

-- VOEscrowRejected 49 + 41

-- VOProxyCleared 49 + 42



DO $$
BEGIN
  RAISE NOTICE 'Finished at %', NOW();
END; $$;
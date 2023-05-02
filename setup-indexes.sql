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
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_deletecomment_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 17;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_deletecomment_author ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 17;

-- TxCustomJson 18
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_customjson_id ON hive.operations ((body::jsonb->'value'->>'id')) WHERE op_type_id = 18;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_customjson_required_auths ON hive.operations ((body::jsonb->'value'->'required_auths')) WHERE op_type_id = 18;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_customjson_required_posting_auths ON hive.operations ((body::jsonb->'value'->'required_posting_auths')) WHERE op_type_id = 18;

-- TxCommentOptions 19
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_commentoptions_author ON hive.operations ((body::jsonb->'value'->>'author')) WHERE op_type_id = 19;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_commentoptions_permlink ON hive.operations ((body::jsonb->'value'->>'permlink')) WHERE op_type_id = 19;

-- TxSetWithdrawVestingRoute 20
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_setwithdrawvestingroute_from_account ON hive.operations ((body::jsonb->'value'->>'from_account')) WHERE op_type_id = 20;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_setwithdrawvestingroute_to_account ON hive.operations ((body::jsonb->'value'->>'to_account')) WHERE op_type_id = 20;

-- TxLimitOrderCreate2 21
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_limitordercreate2_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 21;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_limitordercreate2_orderid ON hive.operations ((body::jsonb->'value'->>'orderid')) WHERE op_type_id = 21;

-- TxClaimAccount 22
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_claimaccount_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 22;

-- TxCreateClaimedAccount 23
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_createclaimedaccount_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 23;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_createclaimedaccount_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name')) WHERE op_type_id = 23;

-- TxRequestAccountRecovery 24
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_requestaccountrecovery_recovery_account ON hive.operations ((body::jsonb->'value'->>'recovery_account')) WHERE op_type_id = 24;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_requestaccountrecovery_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 24;

-- TxRecoverAccount 25
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_recoveraccount_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 25;

-- TxChangeRecoveryAccount 26
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_changerecoveryaccount_account_to_recover ON hive.operations ((body::jsonb->'value'->>'account_to_recover')) WHERE op_type_id = 26;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_changerecoveryaccount_new_recovery_account ON hive.operations ((body::jsonb->'value'->>'new_recovery_account')) WHERE op_type_id = 26;

-- TxEscrowTransfer 27
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowtransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 27;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowtransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 27;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowtransfer_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 27;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowtransfer_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 27;

-- TxEscrowDispute 28
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowdispute_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowdispute_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowdispute_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowdispute_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 28;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowdispute_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 28;

-- TxEscrowRelease 29
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowrelease_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowrelease_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowrelease_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowrelease_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowrelease_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 29;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowrelease_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 29;

-- TxPow2 30

-- TxEscrowApprove 31
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowapprove_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowapprove_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowapprove_agent ON hive.operations ((body::jsonb->'value'->>'agent')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowapprove_who ON hive.operations ((body::jsonb->'value'->>'who')) WHERE op_type_id = 31;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_escrowapprove_escrow_id ON hive.operations ((body::jsonb->'value'->>'escrow_id')) WHERE op_type_id = 31;

-- TxTransferToSavings 32
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transfertosavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 32;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transfertosavings_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 32;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transfertosavings_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 32;

-- TxTransferFromSavings 33
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 33;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transferfromsavings_request_id ON hive.operations ((body::jsonb->'value'->>'request_id')) WHERE op_type_id = 33;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transferfromsavings_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 33;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_transferfromsavings_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 33;

-- TxCancelTransferFromSavings
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_canceltransferfromsavings_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 34;

-- TxCustomBinary 35

-- TxDeclineVotingRights 36
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_declinevotingrights_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 36;

-- reset_account 37
-- set_reset_account 38

-- TxClaimRewardBalance 39
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_claimrewardbalance_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 39;

-- TxDelegateVestingShares 40
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_delegatevestingshares_delegator ON hive.operations ((body::jsonb->'value'->>'delegator')) WHERE op_type_id = 40;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_delegatevestingshares_delegatee ON hive.operations ((body::jsonb->'value'->>'delegatee')) WHERE op_type_id = 40;

-- TxAccountCreateWithDelegation 41
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_accountcreatewithdelegation_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 41;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_accountcreatewithdelegation_new_account_name ON hive.operations ((body::jsonb->'value'->>'new_account_name')) WHERE op_type_id = 41;

-- TxWitnessSetProperties 42
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_witnesssetproperties_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 42;

-- TxAccountUpdate2 43
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_accountupdate2_account ON hive.operations ((body::jsonb->'value'->>'account')) WHERE op_type_id = 43;

-- TxCreateProposal 44
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_createproposal_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 44;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_createproposal_receiver ON hive.operations ((body::jsonb->'value'->>'receiver')) WHERE op_type_id = 44;

-- TxUpdateProposalVotes 45
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_updateproposalvotes_voter ON hive.operations ((body::jsonb->'value'->>'voter')) WHERE op_type_id = 45;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_updateproposalvotes_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids')) WHERE op_type_id = 45;

-- TxRemoveProposal 46
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_removeproposal_proposal_owner ON hive.operations ((body::jsonb->'value'->>'proposal_owner')) WHERE op_type_id = 46;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_removeproposal_proposal_ids ON hive.operations ((body::jsonb->'value'->'proposal_ids')) WHERE op_type_id = 46;

-- TxUpdateProposal 47
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_updateproposal_proposal_id ON hive.operations ((body::jsonb->'value'->>'proposal_id')) WHERE op_type_id = 47;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_updateproposal_creator ON hive.operations ((body::jsonb->'value'->>'creator')) WHERE op_type_id = 47;

-- TxCollateralizedConvert 48
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_collateralizedconvert_owner ON hive.operations ((body::jsonb->'value'->>'owner')) WHERE op_type_id = 48;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_collateralizedconvert_requestid ON hive.operations ((body::jsonb->'value'->>'requestid')) WHERE op_type_id = 48;

-- TxRecurrentTransfer 49
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_recurrenttransfer_from ON hive.operations ((body::jsonb->'value'->>'from')) WHERE op_type_id = 49;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_recurrenttransfer_to ON hive.operations ((body::jsonb->'value'->>'to')) WHERE op_type_id = 49;
CREATE INDEX CONCURRENTLY IF NOT EXISTS hafsql_recurrenttransfer_memo ON hive.operations ((body::jsonb->'value'->>'memo')) WHERE op_type_id = 49;



DO $$
BEGIN
  RAISE NOTICE 'Finished at %', NOW();
END; $$;
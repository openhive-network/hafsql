import { pool } from '../helpers/database.ts'

export const createCommentsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_pending_payout_value_idx ON hafsql.comments_table USING btree (pending_payout_value);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_tags_idx ON hafsql.comments_table USING gin (tags);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_parent_author_parent_permlink_idx ON hafsql.comments_table USING btree (parent_author, parent_permlink);',
	)
	await client.queryObject(
		"CREATE INDEX IF NOT EXISTS hafsql_comments_table_metadata_idx ON hafsql.comments_table USING btree ((metadata->>'content_type'));",
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_created_idx ON hafsql.comments_table USING btree (created);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_author_created_idx ON hafsql.comments_table USING btree (author, created);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_root_author_root_permlink_idx ON hafsql.comments_table USING btree (root_author, root_permlink);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_comments_table_author_id_idx ON hafsql.comments_table USING btree (author, id desc);',
	)
}

export const createDelegationsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_delegations_table_delegatee_idx ON hafsql.delegations_table USING btree (delegatee);',
	)
}

export const createRCDelegationsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_rc_delegations_table_delegatee_idx ON hafsql.rc_delegations_table USING btree (delegatee);',
	)
}

export const createCommunitiesIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_proposal_approvals_voter_idx ON hafsql.proposal_approvals_table USING btree (voter);',
	)
}

export const createReputationsIndexes = async () => {
	// Might be nice to have to sort reputations from high to low
	// using client = await pool.connect()
	// await client.queryObject(
	// 	'CREATE INDEX IF NOT EXISTS hafsql_reputations_table_reputation_idx ON hafsql.reputations_table USING btree (reputation);',
	// )
}

export const createBalancesIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_table_hive_idx ON hafsql.balances_table USING btree (hive);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_table_hbd_idx ON hafsql.balances_table USING btree (hbd);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_table_vests_idx ON hafsql.balances_table USING btree (vests);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_balances_history_table_vests_idx ON hafsql.balances_history_table USING btree (block_num);',
	)
}

export const createFollowsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_follows_table_following_idx ON hafsql.follows_table USING btree (following);',
	)
}

export const createAccountsIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_creator_idx ON hafsql.accounts_table (creator);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_owner_idx ON hafsql.accounts_table USING gin (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_active_idx ON hafsql.accounts_table USING gin (active);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_posting_idx ON hafsql.accounts_table USING gin (posting);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_memo_key_idx ON hafsql.accounts_table (memo_key);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_json_metadata_idx ON hafsql.accounts_table USING gin (json_metadata);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_posting_metadata_idx ON hafsql.accounts_table USING gin (posting_metadata);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_created_at_idx ON hafsql.accounts_table (created_at);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_recovery_idx ON hafsql.accounts_table (recovery);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_withdraw_routes_idx ON hafsql.accounts_table USING gin (withdraw_routes);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_accounts_table_proxy_idx ON hafsql.accounts_table (proxy);',
	)
}

export const createHafsqlIndexes = async () => {
	using client = await pool.connect()
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_reblogs_table_post_idx ON hafsql.reblogs_table USING btree (post);',
	)
}

export const createOperationIndexes = async () => {
	using client = await pool.connect()
	// timestamp for all
	// for (const item in operationTables) {
	// 	await client.queryObject(
	// 		`CREATE INDEX IF NOT EXISTS hafsql_operation_${item}_table_timestamp_idx ON hafsql.operation_${item}_table (timestamp);`,
	// 	)
	// }
	// transfer
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_table_from_account_idx ON hafsql.operation_transfer_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_table_to_account_idx ON hafsql.operation_transfer_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_table_amount_idx ON hafsql.operation_transfer_table (amount);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_table_memo_idx ON hafsql.operation_transfer_table (memo);',
	)
	// transfer_to_vesting
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_table_from_account_idx ON hafsql.operation_transfer_to_vesting_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_table_to_account_idx ON hafsql.operation_transfer_to_vesting_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_table_amount_idx ON hafsql.operation_transfer_to_vesting_table (amount);',
	)
	// withdraw_vesting
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_withdraw_vesting_table_account_idx ON hafsql.operation_withdraw_vesting_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_withdraw_vesting_table_vesting_shares_idx ON hafsql.operation_withdraw_vesting_table (vesting_shares);',
	)
	// limit_order_create
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_limit_order_create_table_owner_idx ON hafsql.operation_limit_order_create_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_limit_order_create_table_orderid_idx ON hafsql.operation_limit_order_create_table (orderid);',
	)
	// limit_order_cancel
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_limit_order_cancel_table_owner_idx ON hafsql.operation_limit_order_cancel_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_limit_order_cancel_table_orderid_idx ON hafsql.operation_limit_order_cancel_table (orderid);',
	)
	// feed_publish
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_feed_publish_table_publisher_idx ON hafsql.operation_feed_publish_table (publisher);',
	)
	// convert
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_convert_table_owner_idx ON hafsql.operation_convert_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_convert_table_requestid_idx ON hafsql.operation_convert_table (requestid);',
	)
	// account_create
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_table_creator_idx ON hafsql.operation_account_create_table (creator);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_table_new_account_name_idx ON hafsql.operation_account_create_table (new_account_name);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_table_owner_idx ON hafsql.operation_account_create_table USING gin (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_table_active_idx ON hafsql.operation_account_create_table USING gin (active);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_table_posting_idx ON hafsql.operation_account_create_table USING gin (posting);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_table_memo_key_idx ON hafsql.operation_account_create_table (memo_key);',
	)
	// account_update
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_update_table_account_idx ON hafsql.operation_account_update_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_update_table_owner_idx ON hafsql.operation_account_update_table USING gin (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_update_table_active_idx ON hafsql.operation_account_update_table USING gin (active);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_update_table_posting_idx ON hafsql.operation_account_update_table USING gin (posting);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_update_table_memo_key_idx ON hafsql.operation_account_update_table (memo_key);',
	)
	// witness_update
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_witness_update_table_owner_idx ON hafsql.operation_witness_update_table (owner);',
	)
	// account_witness_vote
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_witness_vote_table_account_idx ON hafsql.operation_account_witness_vote_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_witness_vote_table_witness_idx ON hafsql.operation_account_witness_vote_table (witness);',
	)
	// account_witness_proxy
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_witness_proxy_table_account_idx ON hafsql.operation_account_witness_proxy_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_witness_proxy_table_proxy_idx ON hafsql.operation_account_witness_proxy_table (proxy);',
	)
	// pow
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_pow_table_worker_account_idx ON hafsql.operation_pow_table (worker_account);',
	)
	// custom
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_custom_table_required_auths_idx ON hafsql.operation_custom_table USING gin (required_auths);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_custom_table_custom_id_idx ON hafsql.operation_custom_table (custom_id);',
	)
	// delete_comment
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_delete_comment_table_author_permlink_idx ON hafsql.operation_delete_comment_table (author, permlink);',
	)
	// comment_options
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_options_table_author_permlink_idx ON hafsql.operation_comment_options_table (author, permlink);',
	)
	// set_withdraw_vesting_route
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_set_withdraw_vesting_route_table_from_account_idx ON hafsql.operation_set_withdraw_vesting_route_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_set_withdraw_vesting_route_table_to_account_idx ON hafsql.operation_set_withdraw_vesting_route_table (to_account);',
	)
	// limit_order_create2
	// claim_account
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_claim_account_table_creator_idx ON hafsql.operation_claim_account_table (creator);',
	)
	// create_claimed_account
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_create_claimed_account_table_creator_idx ON hafsql.operation_create_claimed_account_table (creator);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_create_claimed_account_table_new_account_name_idx ON hafsql.operation_create_claimed_account_table (new_account_name);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_create_claimed_account_table_owner_idx ON hafsql.operation_create_claimed_account_table USING gin (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_create_claimed_account_table_active_idx ON hafsql.operation_create_claimed_account_table USING gin (active);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_create_claimed_account_table_posting_idx ON hafsql.operation_create_claimed_account_table USING gin (posting);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_create_claimed_account_table_memo_key_idx ON hafsql.operation_create_claimed_account_table (memo_key);',
	)
	// request_account_recovery
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_request_account_recovery_table_recovery_account_idx ON hafsql.operation_request_account_recovery_table (recovery_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_request_account_recovery_table_account_to_recover_idx ON hafsql.operation_request_account_recovery_table (account_to_recover);',
	)
	// recover_account
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_recover_account_table_account_to_recover_idx ON hafsql.operation_recover_account_table (account_to_recover);',
	)
	// change_recovery_account
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_change_recovery_account_table_account_to_recover_idx ON hafsql.operation_change_recovery_account_table (account_to_recover);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_change_recovery_account_table_new_recovery_account_idx ON hafsql.operation_change_recovery_account_table (new_recovery_account);',
	)
	// escrow_transfer
	// escrow_dispute
	// escrow_release
	// pow2
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_pow2_table_work_idx ON hafsql.operation_pow2_table USING gin (work);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_pow2_table_props_idx ON hafsql.operation_pow2_table USING gin (props);',
	)
	// escrow_approve
	// transfer_to_savings
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_savings_table_from_account_idx ON hafsql.operation_transfer_to_savings_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_savings_table_to_account_idx ON hafsql.operation_transfer_to_savings_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_savings_table_amount_idx ON hafsql.operation_transfer_to_savings_table (amount);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_savings_table_memo_idx ON hafsql.operation_transfer_to_savings_table (memo);',
	)
	// transfer_from_savings
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_from_savings_table_from_account_idx ON hafsql.operation_transfer_from_savings_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_from_savings_table_to_account_idx ON hafsql.operation_transfer_from_savings_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_from_savings_table_request_id_idx ON hafsql.operation_transfer_from_savings_table (request_id);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_from_savings_table_memo_idx ON hafsql.operation_transfer_from_savings_table (memo);',
	)
	// cancel_transfer_from_savings
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_cancel_transfer_from_savings_table_from_account_idx ON hafsql.operation_cancel_transfer_from_savings_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_cancel_transfer_from_savings_table_request_id_idx ON hafsql.operation_cancel_transfer_from_savings_table (request_id);',
	)
	// decline_voting_rights
	// claim_reward_balance
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_claim_reward_balance_table_account_idx ON hafsql.operation_claim_reward_balance_table (account);',
	)
	// delegate_vesting_shares
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_delegate_vesting_shares_table_delegator_idx ON hafsql.operation_delegate_vesting_shares_table (delegator);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_delegate_vesting_shares_table_delegatee_idx ON hafsql.operation_delegate_vesting_shares_table (delegatee);',
	)
	// account_create_with_delegation
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_with_delegation_table_creator_idx ON hafsql.operation_account_create_with_delegation_table (creator);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_with_delegation_table_new_account_name_idx ON hafsql.operation_account_create_with_delegation_table (new_account_name);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_with_delegation_table_owner_idx ON hafsql.operation_account_create_with_delegation_table USING gin (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_with_delegation_table_active_idx ON hafsql.operation_account_create_with_delegation_table USING gin (active);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_with_delegation_table_posting_idx ON hafsql.operation_account_create_with_delegation_table USING gin (posting);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_create_with_delegation_table_memo_key_idx ON hafsql.operation_account_create_with_delegation_table (memo_key);',
	)
	// witness_set_properties
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_witness_set_properties_table_owner_idx ON hafsql.operation_witness_set_properties_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_witness_set_properties_table_props_idx ON hafsql.operation_witness_set_properties_table USING gin (props);',
	)
	// account_update2
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_update2_table_account_idx ON hafsql.operation_account_update2_table (account);',
	)
	// create_proposal
	// update_proposal_votes
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_update_proposal_votes_table_voter_idx ON hafsql.operation_update_proposal_votes_table (voter);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_update_proposal_votes_table_proposal_ids_idx ON hafsql.operation_update_proposal_votes_table USING gin (proposal_ids);',
	)
	// remove_proposal
	// update_proposal
	// collateralized_convert
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_collateralized_convert_table_owner_idx ON hafsql.operation_collateralized_convert_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_collateralized_convert_table_requestid_idx ON hafsql.operation_collateralized_convert_table (requestid);',
	)
	// recurrent_transfer
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_recurrent_transfer_table_from_account_idx ON hafsql.operation_recurrent_transfer_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_recurrent_transfer_table_to_account_idx ON hafsql.operation_recurrent_transfer_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_recurrent_transfer_table_memo_idx ON hafsql.operation_recurrent_transfer_table (memo);',
	)
	// fill_convert_request
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_convert_request_table_owner_idx ON hafsql.operation_fill_convert_request_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_convert_request_table_requestid_idx ON hafsql.operation_fill_convert_request_table (requestid);',
	)
	// author_reward
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_author_reward_table_author_permlink_idx ON hafsql.operation_author_reward_table (author, permlink);',
	)
	// curation_reward
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_curation_reward_table_author_permlink_idx ON hafsql.operation_curation_reward_table (author, permlink);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_curation_reward_table_curator_idx ON hafsql.operation_curation_reward_table (curator);',
	)
	// comment_reward
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_reward_table_author_permlink_idx ON hafsql.operation_comment_reward_table (author, permlink);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_reward_table_payout_idx ON hafsql.operation_comment_reward_table (payout);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_reward_table_author_rewards_idx ON hafsql.operation_comment_reward_table (author_rewards);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_reward_table_total_payout_value_idx ON hafsql.operation_comment_reward_table (total_payout_value);',
	)
	// liquidity_reward
	// interest
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_interest_table_owner_idx ON hafsql.operation_interest_table (owner);',
	)
	// fill_vesting_withdraw
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_vesting_withdraw_table_from_account_idx ON hafsql.operation_fill_vesting_withdraw_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_vesting_withdraw_table_to_account_idx ON hafsql.operation_fill_vesting_withdraw_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_vesting_withdraw_table_withdrawn_idx ON hafsql.operation_fill_vesting_withdraw_table (withdrawn);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_vesting_withdraw_table_deposited_idx ON hafsql.operation_fill_vesting_withdraw_table (deposited);',
	)
	// fill_order
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_order_table_current_owner_idx ON hafsql.operation_fill_order_table (current_owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_order_table_open_owner_idx ON hafsql.operation_fill_order_table (open_owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_order_table_open_orderid_idx ON hafsql.operation_fill_order_table (open_orderid);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_order_table_current_orderid_idx ON hafsql.operation_fill_order_table (current_orderid);',
	)
	// shutdown_witness
	// fill_transfer_from_savings
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_transfer_from_savings_table_from_account_idx ON hafsql.operation_fill_transfer_from_savings_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_transfer_from_savings_table_to_account_idx ON hafsql.operation_fill_transfer_from_savings_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_transfer_from_savings_table_request_id_idx ON hafsql.operation_fill_transfer_from_savings_table (request_id);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_transfer_from_savings_table_memo_idx ON hafsql.operation_fill_transfer_from_savings_table (memo);',
	)
	// hardfork
	// comment_payout_update
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_payout_update_table_author_permlink_idx ON hafsql.operation_comment_payout_update_table (author, permlink);',
	)
	// return_vesting_delegation
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_return_vesting_delegation_table_account_idx ON hafsql.operation_return_vesting_delegation_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_return_vesting_delegation_table_vesting_shares_idx ON hafsql.operation_return_vesting_delegation_table (vesting_shares);',
	)
	// comment_benefactor_reward
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_benefactor_reward_table_benefactor_idx ON hafsql.operation_comment_benefactor_reward_table (benefactor);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_comment_benefactor_reward_table_author_permlink_idx ON hafsql.operation_comment_benefactor_reward_table (author, permlink);',
	)
	// producer_reward
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_producer_reward_table_producer_idx ON hafsql.operation_producer_reward_table (producer);',
	)
	// clear_null_account_balance
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_clear_null_account_balance_table_total_cleared_idx ON hafsql.operation_clear_null_account_balance_table USING gin (total_cleared);',
	)
	// proposal_pay
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_proposal_pay_table_proposal_id_idx ON hafsql.operation_proposal_pay_table (proposal_id);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_proposal_pay_table_receiver_idx ON hafsql.operation_proposal_pay_table (receiver);',
	)
	// dhf_funding
	// hardfork_hive
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_hardfork_hive_table_account_idx ON hafsql.operation_hardfork_hive_table (account);',
	)
	// hardfork_hive_restore
	// delayed_voting
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_delayed_voting_table_voter_idx ON hafsql.operation_delayed_voting_table (voter);',
	)
	// consolidate_treasury_balance
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_consolidate_treasury_balance_table_total_moved_idx ON hafsql.operation_consolidate_treasury_balance_table USING gin (total_moved);',
	)
	// ineffective_delete_comment
	// dhf_conversion
	// expired_account_notification
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_expired_account_notification_table_account_idx ON hafsql.operation_expired_account_notification_table (account);',
	)
	// changed_recovery_account
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_changed_recovery_account_table_account_idx ON hafsql.operation_changed_recovery_account_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_changed_recovery_account_table_old_recovery_account_idx ON hafsql.operation_changed_recovery_account_table (old_recovery_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_changed_recovery_account_table_new_recovery_account_idx ON hafsql.operation_changed_recovery_account_table (new_recovery_account);',
	)
	// transfer_to_vesting_completed
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_completed_table_from_account_idx ON hafsql.operation_transfer_to_vesting_completed_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_completed_table_to_account_idx ON hafsql.operation_transfer_to_vesting_completed_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_completed_table_hive_vested_idx ON hafsql.operation_transfer_to_vesting_completed_table (hive_vested);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_transfer_to_vesting_completed_table_vesting_shares_received_idx ON hafsql.operation_transfer_to_vesting_completed_table (vesting_shares_received);',
	)
	// pow_reward
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_pow_reward_table_worker_idx ON hafsql.operation_pow_reward_table (worker);',
	)
	// vesting_shares_split
	// account_created
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_created_table_new_account_name_idx ON hafsql.operation_account_created_table (new_account_name);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_account_created_table_creator_idx ON hafsql.operation_account_created_table (creator);',
	)
	// fill_collateralized_convert_request
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_collateralized_convert_request_table_owner_idx ON hafsql.operation_fill_collateralized_convert_request_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_collateralized_convert_request_table_requestid_idx ON hafsql.operation_fill_collateralized_convert_request_table (requestid);',
	)
	// system_warning
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_system_warning_table_message_idx ON hafsql.operation_system_warning_table (message);',
	)
	// fill_recurrent_transfer
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_recurrent_transfer_table_from_account_idx ON hafsql.operation_fill_recurrent_transfer_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_recurrent_transfer_table_to_account_idx ON hafsql.operation_fill_recurrent_transfer_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_fill_recurrent_transfer_table_memo_idx ON hafsql.operation_fill_recurrent_transfer_table (memo);',
	)
	// failed_recurrent_transfer
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_failed_recurrent_transfer_table_from_account_idx ON hafsql.operation_failed_recurrent_transfer_table (from_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_failed_recurrent_transfer_table_to_account_idx ON hafsql.operation_failed_recurrent_transfer_table (to_account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_failed_recurrent_transfer_table_memo_idx ON hafsql.operation_failed_recurrent_transfer_table (memo);',
	)
	// limit_order_cancelled
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_limit_order_cancelled_table_seller_idx ON hafsql.operation_limit_order_cancelled_table (seller);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_limit_order_cancelled_table_orderid_idx ON hafsql.operation_limit_order_cancelled_table (orderid);',
	)
	// producer_missed
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_producer_missed_table_producer_idx ON hafsql.operation_producer_missed_table (producer);',
	)
	// proposal_fee
	// collateralized_convert_immediate_conversion
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_collateralized_convert_immediate_conversion_table_owner_idx ON hafsql.operation_collateralized_convert_immediate_conversion_table (owner);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_collateralized_convert_immediate_conversion_table_requestid_idx ON hafsql.operation_collateralized_convert_immediate_conversion_table (requestid);',
	)
	// escrow_approved
	// escrow_rejected
	// proxy_cleared
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_proxy_cleared_table_account_idx ON hafsql.operation_proxy_cleared_table (account);',
	)
	await client.queryObject(
		'CREATE INDEX IF NOT EXISTS hafsql_operation_proxy_cleared_table_proxy_idx ON hafsql.operation_proxy_cleared_table (proxy);',
	)
}

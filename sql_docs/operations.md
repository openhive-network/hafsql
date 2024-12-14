---
icon: stack
order: 97
---




<!-- AUTO GENERATED -->
<!-- DO NOT EDIT THIS PAGE -->
<!-- To edit this page see "excluded/operations.md" -->
<!-- The following script generates the list of operations -->
<!-- and merges that with "excluded/operations.md" -->
<!-- The output goes to "sql_docs/operations.md" -->
<!-- SEE sql_docs/helpers/operations_helper.ts -->






# Operations
Every single Hive operation is available here. There are indexes on some of their parameters as well so it is possible to search them by their parameters.
!!!
Indexes work from left to right. For example the index on `(col1, col2, col3)` will work for queries that filter for col1, queries that filter for col1 AND col2, and for the queries that filter for col1 AND col2 AND col3.
!!!

!!!
In all of the listed tables/views the primary key is `id`. Which we call operation id.  
To filter the operations by `block_num`, checkout [this](/helper_functions/#last_op_id_from_block_numint4) and [this](/helper_functions/#first_op_id_from_block_numint4) helper functions.  
To filter the operations by `timestamp`, checkout [this](/helper_functions/#id_from_timestamptimestamp-highest-boolean-default-false) helper function.
!!!

***
Note: The following is auto generated.
***

<!-- deno run docs -->

### 1. operation_account_create_table
```sql
SELECT * FROM hafsql.operation_account_create_table
LIMIT 1
```
|id|fee|fee_symbol|creator|new_account_name|owner|active|posting|memo_key|json_metadata|
|--|---|----------|-------|----------------|-----|------|-------|--------|-------------|
|int8|numeric|varchar|varchar|varchar|jsonb|jsonb|jsonb|varchar|jsonb|

Indexes on: `(id)` | `(creator)` | `(new_account_name)` | `(owner)` | `(active)` | `(posting)` | `(memo_key)`

***
### 2. operation_account_create_with_delegation_table
```sql
SELECT * FROM hafsql.operation_account_create_with_delegation_table
LIMIT 1
```
|id|creator|new_account_name|fee|fee_symbol|delegation|owner|active|posting|memo_key|json_metadata|extensions|
|--|-------|----------------|---|----------|----------|-----|------|-------|--------|-------------|----------|
|int8|varchar|varchar|numeric|varchar|numeric|jsonb|jsonb|jsonb|varchar|jsonb|jsonb|

Indexes on: `(id)` | `(creator)` | `(new_account_name)` | `(owner)` | `(active)` | `(posting)` | `(memo_key)`

***
### 3. operation_account_created_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_account_created_table
LIMIT 1
```
|id|new_account_name|creator|initial_vesting_shares|initial_delegation|
|--|----------------|-------|----------------------|------------------|
|int8|varchar|varchar|numeric|numeric|

Indexes on: `(id)` | `(new_account_name)` | `(creator)`

***
### 4. operation_account_update2_table
```sql
SELECT * FROM hafsql.operation_account_update2_table
LIMIT 1
```
|id|account|json_metadata|posting_json_metadata|extensions|
|--|-------|-------------|---------------------|----------|
|int8|varchar|jsonb|jsonb|jsonb|

Indexes on: `(id)` | `(account)`

***
### 5. operation_account_update_table
```sql
SELECT * FROM hafsql.operation_account_update_table
LIMIT 1
```
|id|account|owner|active|posting|memo_key|json_metadata|
|--|-------|-----|------|-------|--------|-------------|
|int8|varchar|jsonb|jsonb|jsonb|varchar|jsonb|

Indexes on: `(id)` | `(account)` | `(owner)` | `(active)` | `(posting)` | `(memo_key)`

***
### 6. operation_account_witness_proxy_table
```sql
SELECT * FROM hafsql.operation_account_witness_proxy_table
LIMIT 1
```
|id|account|proxy|
|--|-------|-----|
|int8|varchar|varchar|

Indexes on: `(id)` | `(account)` | `(proxy)`

***
### 7. operation_account_witness_vote_table
```sql
SELECT * FROM hafsql.operation_account_witness_vote_table
LIMIT 1
```
|id|account|witness|approve|
|--|-------|-------|-------|
|int8|varchar|varchar|bool|

Indexes on: `(id)` | `(account)` | `(witness)`

***
### 8. operation_author_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_author_reward_table
LIMIT 1
```
|id|author|permlink|hbd_payout|hive_payout|vesting_payout|curators_vesting_payout|payout_must_be_claimed|
|--|------|--------|----------|-----------|--------------|-----------------------|----------------------|
|int8|varchar|varchar|numeric|numeric|numeric|numeric|bool|

Indexes on: `(id)` | `(author, permlink)`

***
### 9. operation_cancel_transfer_from_savings_table
```sql
SELECT * FROM hafsql.operation_cancel_transfer_from_savings_table
LIMIT 1
```
|id|from_account|request_id|
|--|------------|----------|
|int8|varchar|int8|

Indexes on: `(id)` | `(from_account)` | `(request_id)`

***
### 10. operation_change_recovery_account_table
```sql
SELECT * FROM hafsql.operation_change_recovery_account_table
LIMIT 1
```
|id|account_to_recover|new_recovery_account|extensions|
|--|------------------|--------------------|----------|
|int8|varchar|varchar|jsonb|

Indexes on: `(id)` | `(account_to_recover)` | `(new_recovery_account)`

***
### 11. operation_changed_recovery_account_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_changed_recovery_account_table
LIMIT 1
```
|id|account|old_recovery_account|new_recovery_account|
|--|-------|--------------------|--------------------|
|int8|varchar|varchar|varchar|

Indexes on: `(id)` | `(old_recovery_account)` | `(account)` | `(new_recovery_account)`

***
### 12. operation_claim_account_table
```sql
SELECT * FROM hafsql.operation_claim_account_table
LIMIT 1
```
|id|creator|fee|symbol|extensions|
|--|-------|---|------|----------|
|int8|varchar|numeric|varchar|jsonb|

Indexes on: `(id)` | `(creator)`

***
### 13. operation_claim_reward_balance_table
```sql
SELECT * FROM hafsql.operation_claim_reward_balance_table
LIMIT 1
```
|id|account|reward_hive|reward_hbd|reward_vests|
|--|-------|-----------|----------|------------|
|int8|varchar|numeric|numeric|numeric|

Indexes on: `(id)` | `(account)`

***
### 14. operation_clear_null_account_balance_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_clear_null_account_balance_table
LIMIT 1
```
|id|total_cleared|
|--|-------------|
|int8|jsonb|

Indexes on: `(id)` | `(total_cleared)`

***
### 15. operation_collateralized_convert_immediate_conversion_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_collateralized_convert_immediate_conversion_table
LIMIT 1
```
|id|owner|requestid|hbd_out|
|--|-----|---------|-------|
|int8|varchar|int8|numeric|

Indexes on: `(id)`

***
### 16. operation_collateralized_convert_table
```sql
SELECT * FROM hafsql.operation_collateralized_convert_table
LIMIT 1
```
|id|owner|requestid|amount|symbol|
|--|-----|---------|------|------|
|int8|varchar|int8|numeric|varchar|

Indexes on: `(id)` | `(owner)` | `(requestid)`

***
### 17. operation_comment_benefactor_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_comment_benefactor_reward_table
LIMIT 1
```
|id|benefactor|author|permlink|hbd_payout|hive_payout|vesting_payout|payout_must_be_claimed|
|--|----------|------|--------|----------|-----------|--------------|----------------------|
|int8|varchar|varchar|varchar|numeric|numeric|numeric|bool|

Indexes on: `(id)` | `(benefactor)` | `(author, permlink)`

***
### 18. operation_comment_options_table
```sql
SELECT * FROM hafsql.operation_comment_options_table
LIMIT 1
```
|id|author|permlink|max_accepted_payout|max_accepted_payout_symbol|percent_hbd|allow_votes|allow_curation_rewards|extensions|
|--|------|--------|-------------------|--------------------------|-----------|-----------|----------------------|----------|
|int8|varchar|varchar|numeric|varchar|int2|bool|bool|jsonb|

Indexes on: `(id)` | `(author, permlink)`

***
### 19. operation_comment_payout_update_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_comment_payout_update_table
LIMIT 1
```
|id|author|permlink|
|--|------|--------|
|int8|varchar|varchar|

Indexes on: `(id)` | `(author, permlink)`

***
### 20. operation_comment_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_comment_reward_table
LIMIT 1
```
|id|author|permlink|payout|author_rewards|total_payout_value|curator_payout_value|beneficiary_payout_value|
|--|------|--------|------|--------------|------------------|--------------------|------------------------|
|int8|varchar|varchar|numeric|numeric|numeric|numeric|numeric|

Indexes on: `(id)` | `(author, permlink)` | `(payout)` | `(author_rewards)` | `(total_payout_value)`

***
### 21. operation_comment_view
```sql
SELECT * FROM hafsql.operation_comment_view
LIMIT 1
```
|id|timestamp|author|permlink|parent_author|parent_permlink|title|body|json_metadata|block_num|trx_id|
|--|---------|------|--------|-------------|---------------|-----|----|-------------|---------|------|
|int8|timestamp|text|text|text|text|text|text|jsonb|int4|text|

Indexes on: `(author, permlink, id)` | `(author, id)` | `(parent_author, id)` | `(parent_author, parent_permlink)` | `((json_metadata->>'content_type'), id)` | `(id)`

***
### 22. operation_consolidate_treasury_balance_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_consolidate_treasury_balance_table
LIMIT 1
```
|id|total_moved|
|--|-----------|
|int8|jsonb|

Indexes on: `(id)` | `(total_moved)`

***
### 23. operation_convert_table
```sql
SELECT * FROM hafsql.operation_convert_table
LIMIT 1
```
|id|owner|requestid|amount|symbol|
|--|-----|---------|------|------|
|int8|varchar|int8|numeric|varchar|

Indexes on: `(id)` | `(owner)` | `(requestid)`

***
### 24. operation_create_claimed_account_table
```sql
SELECT * FROM hafsql.operation_create_claimed_account_table
LIMIT 1
```
|id|creator|new_account_name|owner|active|posting|memo_key|json_metadata|extensions|
|--|-------|----------------|-----|------|-------|--------|-------------|----------|
|int8|varchar|varchar|jsonb|jsonb|jsonb|varchar|jsonb|jsonb|

Indexes on: `(id)` | `(creator)` | `(new_account_name)` | `(owner)` | `(active)` | `(posting)` | `(memo_key)`

***
### 25. operation_create_proposal_table
```sql
SELECT * FROM hafsql.operation_create_proposal_table
LIMIT 1
```
|id|creator|receiver|subject|permlink|start_date|end_date|daily_pay|daily_pay_symbol|extensions|
|--|-------|--------|-------|--------|----------|--------|---------|----------------|----------|
|int8|varchar|varchar|varchar|varchar|timestamp|timestamp|numeric|varchar|jsonb|

Indexes on: `(id)`

***
### 26. operation_curation_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_curation_reward_table
LIMIT 1
```
|id|curator|reward|symbol|author|permlink|payout_must_be_claimed|
|--|-------|------|------|------|--------|----------------------|
|int8|varchar|numeric|varchar|varchar|varchar|bool|

Indexes on: `(id)` | `(author, permlink)` | `(curator)`

***
### 27. operation_custom_json_view
```sql
SELECT * FROM hafsql.operation_custom_json_view
LIMIT 1
```
|id|timestamp|required_auths|required_posting_auths|custom_id|json|block_num|trx_id|
|--|---------|--------------|----------------------|---------|----|---------|------|
|int8|timestamp|jsonb|jsonb|text|text|int4|text|

Indexes on: `(custom_id, id)` | `(id)`

***
### 28. operation_custom_table
```sql
SELECT * FROM hafsql.operation_custom_table
LIMIT 1
```
|id|required_auths|custom_id|data|
|--|--------------|---------|----|
|int8|jsonb|int8|varchar|

Indexes on: `(id)` | `(required_auths)` | `(custom_id)`

***
### 29. operation_decline_voting_rights_table
```sql
SELECT * FROM hafsql.operation_decline_voting_rights_table
LIMIT 1
```
|id|account|decline|
|--|-------|-------|
|int8|varchar|bool|

Indexes on: `(id)`

***
### 30. operation_delayed_voting_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_delayed_voting_table
LIMIT 1
```
|id|voter|votes|
|--|-----|-----|
|int8|varchar|int8|

Indexes on: `(id)` | `(voter)`

***
### 31. operation_delegate_vesting_shares_table
```sql
SELECT * FROM hafsql.operation_delegate_vesting_shares_table
LIMIT 1
```
|id|delegator|delegatee|vesting_shares|
|--|---------|---------|--------------|
|int8|varchar|varchar|numeric|

Indexes on: `(id)` | `(delegator)` | `(delegatee)`

***
### 32. operation_delete_comment_table
```sql
SELECT * FROM hafsql.operation_delete_comment_table
LIMIT 1
```
|id|author|permlink|
|--|------|--------|
|int8|varchar|varchar|

Indexes on: `(id)` | `(author, permlink)`

***
### 33. operation_dhf_conversion_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_dhf_conversion_table
LIMIT 1
```
|id|treasury|hive_amount_in|hbd_amount_out|
|--|--------|--------------|--------------|
|int8|varchar|numeric|numeric|

Indexes on: `(id)`

***
### 34. operation_dhf_funding_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_dhf_funding_table
LIMIT 1
```
|id|treasury|additional_funds|symbol|
|--|--------|----------------|------|
|int8|varchar|numeric|varchar|

Indexes on: `(id)`

***
### 35. operation_effective_comment_vote_view [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_effective_comment_vote_view
LIMIT 1
```
|id|timestamp|voter|author|permlink|weight|rshares|total_vote_weight|pending_payout|pending_payout_symbol|block_num|
|--|---------|-----|------|--------|------|-------|-----------------|--------------|---------------------|---------|
|int8|timestamp|text|text|text|text|numeric|text|numeric|text|int4|

Indexes on: `(author, permlink, id)` | `(author, id)` | `(voter, id)` | `(id)`

***
### 36. operation_escrow_approve_table
```sql
SELECT * FROM hafsql.operation_escrow_approve_table
LIMIT 1
```
|id|from_account|to_account|agent|who|escrow_id|approve|
|--|------------|----------|-----|---|---------|-------|
|int8|varchar|varchar|varchar|varchar|int8|bool|

Indexes on: `(id)`

***
### 37. operation_escrow_approved_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_escrow_approved_table
LIMIT 1
```
|id|from_account|to_account|agent|escrow_id|fee|fee_symbol|
|--|------------|----------|-----|---------|---|----------|
|int8|varchar|varchar|varchar|int8|numeric|varchar|

Indexes on: `(id)`

***
### 38. operation_escrow_dispute_table
```sql
SELECT * FROM hafsql.operation_escrow_dispute_table
LIMIT 1
```
|id|from_account|to_account|agent|who|escrow_id|
|--|------------|----------|-----|---|---------|
|int8|varchar|varchar|varchar|varchar|int8|

Indexes on: `(id)`

***
### 39. operation_escrow_rejected_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_escrow_rejected_table
LIMIT 1
```
|id|from_account|to_account|agent|escrow_id|hbd_amount|hive_amount|fee|fee_symbol|
|--|------------|----------|-----|---------|----------|-----------|---|----------|
|int8|varchar|varchar|varchar|int8|numeric|numeric|numeric|varchar|

Indexes on: `(id)`

***
### 40. operation_escrow_release_table
```sql
SELECT * FROM hafsql.operation_escrow_release_table
LIMIT 1
```
|id|from_account|to_account|agent|who|receiver|escrow_id|hbd_amount|hive_amount|
|--|------------|----------|-----|---|--------|---------|----------|-----------|
|int8|varchar|varchar|varchar|varchar|varchar|int8|numeric|numeric|

Indexes on: `(id)`

***
### 41. operation_escrow_transfer_table
```sql
SELECT * FROM hafsql.operation_escrow_transfer_table
LIMIT 1
```
|id|from_account|to_account|hbd_amount|hive_amount|escrow_id|agent|fee|fee_symbol|json_meta|ratification_deadline|escrow_expiration|
|--|------------|----------|----------|-----------|---------|-----|---|----------|---------|---------------------|-----------------|
|int8|varchar|varchar|numeric|numeric|int8|varchar|numeric|varchar|jsonb|timestamp|timestamp|

Indexes on: `(id)`

***
### 42. operation_expired_account_notification_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_expired_account_notification_table
LIMIT 1
```
|id|account|
|--|-------|
|int8|varchar|

Indexes on: `(id)` | `(account)`

***
### 43. operation_failed_recurrent_transfer_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_failed_recurrent_transfer_table
LIMIT 1
```
|id|from_account|to_account|amount|symbol|memo|consecutive_failures|remaining_executions|deleted|
|--|------------|----------|------|------|----|--------------------|--------------------|-------|
|int8|varchar|varchar|numeric|varchar|varchar|int2|int2|bool|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(memo)`

***
### 44. operation_feed_publish_table
```sql
SELECT * FROM hafsql.operation_feed_publish_table
LIMIT 1
```
|id|publisher|exchange_rate_base_amount|exchange_rate_base_symbol|exchange_rate_quote_amount|exchange_rate_quote_symbol|
|--|---------|-------------------------|-------------------------|--------------------------|--------------------------|
|int8|varchar|numeric|varchar|numeric|varchar|

Indexes on: `(id)` | `(publisher)`

***
### 45. operation_fill_collateralized_convert_request_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_fill_collateralized_convert_request_table
LIMIT 1
```
|id|owner|requestid|amount_in|amount_in_symbol|amount_out|amount_out_symbol|excess_collateral|excess_collateral_symbol|
|--|-----|---------|---------|----------------|----------|-----------------|-----------------|------------------------|
|int8|varchar|int8|numeric|varchar|numeric|varchar|numeric|varchar|

Indexes on: `(id)` | `(owner)` | `(requestid)`

***
### 46. operation_fill_convert_request_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_fill_convert_request_table
LIMIT 1
```
|id|owner|requestid|amount_in|amount_in_symbol|amount_out|amount_out_symbol|
|--|-----|---------|---------|----------------|----------|-----------------|
|int8|varchar|int8|numeric|varchar|numeric|varchar|

Indexes on: `(id)` | `(owner)` | `(requestid)`

***
### 47. operation_fill_order_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_fill_order_table
LIMIT 1
```
|id|current_owner|open_owner|current_orderid|open_orderid|current_pays|current_pays_symbol|open_pays|open_pays_symbol|
|--|-------------|----------|---------------|------------|------------|-------------------|---------|----------------|
|int8|varchar|varchar|int8|int8|numeric|varchar|numeric|varchar|

Indexes on: `(id)` | `(open_owner)` | `(open_orderid)` | `(current_orderid)` | `(current_owner)`

***
### 48. operation_fill_recurrent_transfer_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_fill_recurrent_transfer_table
LIMIT 1
```
|id|from_account|to_account|amount|symbol|memo|remaining_executions|
|--|------------|----------|------|------|----|--------------------|
|int8|varchar|varchar|numeric|varchar|varchar|int2|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(memo)`

***
### 49. operation_fill_transfer_from_savings_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_fill_transfer_from_savings_table
LIMIT 1
```
|id|from_account|to_account|request_id|memo|amount|symbol|
|--|------------|----------|----------|----|------|------|
|int8|varchar|varchar|int8|varchar|numeric|varchar|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(request_id)` | `(memo)`

***
### 50. operation_fill_vesting_withdraw_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_fill_vesting_withdraw_table
LIMIT 1
```
|id|from_account|to_account|withdrawn|withdrawn_symbol|deposited|deposited_symbol|
|--|------------|----------|---------|----------------|---------|----------------|
|int8|varchar|varchar|numeric|varchar|numeric|varchar|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(withdrawn)` | `(deposited)`

***
### 51. operation_hardfork_hive_restore_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_hardfork_hive_restore_table
LIMIT 1
```
|id|account|treasury|hbd_transferred|hive_transferred|
|--|-------|--------|---------------|----------------|
|int8|varchar|varchar|numeric|numeric|

Indexes on: `(id)`

***
### 52. operation_hardfork_hive_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_hardfork_hive_table
LIMIT 1
```
|id|account|treasury|other_affected_accounts|hive_transferred|hbd_transferred|vests_converted|total_hive_from_vests|
|--|-------|--------|-----------------------|----------------|---------------|---------------|---------------------|
|int8|varchar|varchar|jsonb|numeric|numeric|numeric|numeric|

Indexes on: `(id)` | `(account)`

***
### 53. operation_hardfork_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_hardfork_table
LIMIT 1
```
|id|hardfork_id|
|--|-----------|
|int8|int2|

Indexes on: `(id)`

***
### 54. operation_ineffective_delete_comment_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_ineffective_delete_comment_table
LIMIT 1
```
|id|author|permlink|
|--|------|--------|
|int8|varchar|varchar|

Indexes on: `(id)`

***
### 55. operation_interest_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_interest_table
LIMIT 1
```
|id|owner|interest|interest_symbol|is_saved_into_hbd_balance|
|--|-----|--------|---------------|-------------------------|
|int8|varchar|numeric|varchar|bool|

Indexes on: `(id)` | `(owner)`

***
### 56. operation_limit_order_cancel_table
```sql
SELECT * FROM hafsql.operation_limit_order_cancel_table
LIMIT 1
```
|id|owner|orderid|
|--|-----|-------|
|int8|varchar|int8|

Indexes on: `(id)` | `(owner)` | `(orderid)`

***
### 57. operation_limit_order_cancelled_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_limit_order_cancelled_table
LIMIT 1
```
|id|seller|orderid|amount_back|symbol|
|--|------|-------|-----------|------|
|int8|varchar|int8|numeric|varchar|

Indexes on: `(id)` | `(seller)` | `(orderid)`

***
### 58. operation_limit_order_create2_table
```sql
SELECT * FROM hafsql.operation_limit_order_create2_table
LIMIT 1
```
|id|owner|orderid|amount_to_sell|amount_to_sell_symbol|exchange_rate_base|exchange_rate_base_symbol|exchange_rate_quote|exchange_rate_quote_symbol|fill_or_kill|expiration|
|--|-----|-------|--------------|---------------------|------------------|-------------------------|-------------------|--------------------------|------------|----------|
|int8|varchar|int8|numeric|varchar|numeric|varchar|numeric|varchar|bool|timestamp|

Indexes on: `(id)`

***
### 59. operation_limit_order_create_table
```sql
SELECT * FROM hafsql.operation_limit_order_create_table
LIMIT 1
```
|id|owner|orderid|expiration|amount_to_sell|amount_to_sell_symbol|min_to_receive|min_to_receive_symbol|fill_or_kill|
|--|-----|-------|----------|--------------|---------------------|--------------|---------------------|------------|
|int8|varchar|int8|timestamp|numeric|varchar|numeric|varchar|bool|

Indexes on: `(id)` | `(owner)` | `(orderid)`

***
### 60. operation_liquidity_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_liquidity_reward_table
LIMIT 1
```
|id|owner|payout|symbol|
|--|-----|------|------|
|int8|varchar|numeric|varchar|

Indexes on: `(id)`

***
### 61. operation_pow2_table
```sql
SELECT * FROM hafsql.operation_pow2_table
LIMIT 1
```
|id|work|props|
|--|----|-----|
|int8|jsonb|jsonb|

Indexes on: `(id)` | `(work)` | `(props)`

***
### 62. operation_pow_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_pow_reward_table
LIMIT 1
```
|id|worker|reward|symbol|
|--|------|------|------|
|int8|varchar|numeric|varchar|

Indexes on: `(id)` | `(worker)`

***
### 63. operation_pow_table
```sql
SELECT * FROM hafsql.operation_pow_table
LIMIT 1
```
|id|worker_account|block_id|nonce|work|props|
|--|--------------|--------|-----|----|-----|
|int8|varchar|varchar|varchar|jsonb|jsonb|

Indexes on: `(id)` | `(worker_account)`

***
### 64. operation_producer_missed_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_producer_missed_table
LIMIT 1
```
|id|producer|
|--|--------|
|int8|varchar|

Indexes on: `(id)` | `(producer)`

***
### 65. operation_producer_reward_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_producer_reward_table
LIMIT 1
```
|id|producer|vesting_shares|vesting_shares_symbol|
|--|--------|--------------|---------------------|
|int8|varchar|numeric|varchar|

Indexes on: `(id)` | `(producer)`

***
### 66. operation_proposal_fee_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_proposal_fee_table
LIMIT 1
```
|id|creator|treasury|proposal_id|fee|fee_symbol|
|--|-------|--------|-----------|---|----------|
|int8|varchar|varchar|int2|numeric|varchar|

Indexes on: `(id)`

***
### 67. operation_proposal_pay_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_proposal_pay_table
LIMIT 1
```
|id|proposal_id|receiver|payer|payment|symbol|
|--|-----------|--------|-----|-------|------|
|int8|int2|varchar|varchar|numeric|varchar|

Indexes on: `(id)` | `(proposal_id)` | `(receiver)`

***
### 68. operation_proxy_cleared_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_proxy_cleared_table
LIMIT 1
```
|id|account|proxy|
|--|-------|-----|
|int8|varchar|varchar|

Indexes on: `(id)` | `(account)` | `(proxy)`

***
### 69. operation_recover_account_table
```sql
SELECT * FROM hafsql.operation_recover_account_table
LIMIT 1
```
|id|account_to_recover|new_owner_authority|recent_owner_authority|extensions|
|--|------------------|-------------------|----------------------|----------|
|int8|varchar|jsonb|jsonb|jsonb|

Indexes on: `(id)` | `(account_to_recover)`

***
### 70. operation_recurrent_transfer_table
```sql
SELECT * FROM hafsql.operation_recurrent_transfer_table
LIMIT 1
```
|id|from_account|to_account|amount|symbol|memo|recurrence|executions|extensions|
|--|------------|----------|------|------|----|----------|----------|----------|
|int8|varchar|varchar|numeric|varchar|varchar|int2|int2|jsonb|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(memo)`

***
### 71. operation_remove_proposal_table
```sql
SELECT * FROM hafsql.operation_remove_proposal_table
LIMIT 1
```
|id|proposal_owner|proposal_ids|extensions|
|--|--------------|------------|----------|
|int8|varchar|jsonb|jsonb|

Indexes on: `(id)`

***
### 72. operation_request_account_recovery_table
```sql
SELECT * FROM hafsql.operation_request_account_recovery_table
LIMIT 1
```
|id|recovery_account|account_to_recover|new_owner_authority|extensions|
|--|----------------|------------------|-------------------|----------|
|int8|varchar|varchar|jsonb|jsonb|

Indexes on: `(id)` | `(recovery_account)` | `(account_to_recover)`

***
### 73. operation_return_vesting_delegation_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_return_vesting_delegation_table
LIMIT 1
```
|id|account|vesting_shares|
|--|-------|--------------|
|int8|varchar|numeric|

Indexes on: `(id)` | `(account)` | `(vesting_shares)`

***
### 74. operation_set_withdraw_vesting_route_table
```sql
SELECT * FROM hafsql.operation_set_withdraw_vesting_route_table
LIMIT 1
```
|id|from_account|to_account|percent|auto_vest|
|--|------------|----------|-------|---------|
|int8|varchar|varchar|int2|bool|

Indexes on: `(id)` | `(from_account)` | `(to_account)`

***
### 75. operation_shutdown_witness_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_shutdown_witness_table
LIMIT 1
```
|id|owner|
|--|-----|
|int8|varchar|

Indexes on: `(id)`

***
### 76. operation_system_warning_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_system_warning_table
LIMIT 1
```
|id|message|
|--|-------|
|int8|varchar|

Indexes on: `(id)` | `(message)`

***
### 77. operation_transfer_from_savings_table
```sql
SELECT * FROM hafsql.operation_transfer_from_savings_table
LIMIT 1
```
|id|from_account|to_account|request_id|amount|symbol|memo|
|--|------------|----------|----------|------|------|----|
|int8|varchar|varchar|int8|numeric|varchar|varchar|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(request_id)` | `(memo)`

***
### 78. operation_transfer_table
```sql
SELECT * FROM hafsql.operation_transfer_table
LIMIT 1
```
|id|from_account|to_account|amount|symbol|memo|
|--|------------|----------|------|------|----|
|int8|varchar|varchar|numeric|varchar|varchar|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(amount)` | `(memo)`

***
### 79. operation_transfer_to_savings_table
```sql
SELECT * FROM hafsql.operation_transfer_to_savings_table
LIMIT 1
```
|id|from_account|to_account|amount|symbol|memo|
|--|------------|----------|------|------|----|
|int8|varchar|varchar|numeric|varchar|varchar|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(amount)` | `(memo)`

***
### 80. operation_transfer_to_vesting_completed_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_transfer_to_vesting_completed_table
LIMIT 1
```
|id|from_account|to_account|hive_vested|vesting_shares_received|
|--|------------|----------|-----------|-----------------------|
|int8|varchar|varchar|numeric|numeric|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(hive_vested)` | `(vesting_shares_received)`

***
### 81. operation_transfer_to_vesting_table
```sql
SELECT * FROM hafsql.operation_transfer_to_vesting_table
LIMIT 1
```
|id|from_account|to_account|amount|symbol|
|--|------------|----------|------|------|
|int8|varchar|varchar|numeric|varchar|

Indexes on: `(id)` | `(from_account)` | `(to_account)` | `(amount)`

***
### 82. operation_update_proposal_table
```sql
SELECT * FROM hafsql.operation_update_proposal_table
LIMIT 1
```
|id|proposal_id|creator|daily_pay|daily_pay_symbol|subject|permlink|extensions|
|--|-----------|-------|---------|----------------|-------|--------|----------|
|int8|int2|varchar|numeric|varchar|varchar|varchar|jsonb|

Indexes on: `(id)`

***
### 83. operation_update_proposal_votes_table
```sql
SELECT * FROM hafsql.operation_update_proposal_votes_table
LIMIT 1
```
|id|voter|proposal_ids|approve|extensions|
|--|-----|------------|-------|----------|
|int8|varchar|jsonb|bool|jsonb|

Indexes on: `(id)` | `(voter)` | `(proposal_ids)`

***
### 84. operation_vesting_shares_split_table [!badge size="xs" text="Virtual"]
```sql
SELECT * FROM hafsql.operation_vesting_shares_split_table
LIMIT 1
```
|id|owner|vesting_shares_before_split|vesting_shares_after_split|
|--|-----|---------------------------|--------------------------|
|int8|varchar|numeric|numeric|

Indexes on: `(id)`

***
### 85. operation_vote_view
```sql
SELECT * FROM hafsql.operation_vote_view
LIMIT 1
```
|id|timestamp|voter|author|weight|permlink|block_num|trx_id|
|--|---------|-----|------|------|--------|---------|------|
|int8|timestamp|text|text|int4|text|int4|text|

Indexes on: `(author, permlink, id)` | `(author, id)` | `(voter, id)` | `(id)`

***
### 86. operation_withdraw_vesting_table
```sql
SELECT * FROM hafsql.operation_withdraw_vesting_table
LIMIT 1
```
|id|account|vesting_shares|symbol|
|--|-------|--------------|------|
|int8|varchar|numeric|varchar|

Indexes on: `(id)` | `(account)` | `(vesting_shares)`

***
### 87. operation_witness_set_properties_table
```sql
SELECT * FROM hafsql.operation_witness_set_properties_table
LIMIT 1
```
|id|owner|props|extensions|
|--|-----|-----|----------|
|int8|varchar|jsonb|jsonb|

Indexes on: `(id)` | `(owner)` | `(props)`

***
### 88. operation_witness_update_table
```sql
SELECT * FROM hafsql.operation_witness_update_table
LIMIT 1
```
|id|owner|url|block_signing_key|props_hbd_interest_rate|props_maximum_block_size|props_account_creation_fee|props_account_creation_fee_symbol|fee|symbol|
|--|-----|---|-----------------|-----------------------|------------------------|--------------------------|---------------------------------|---|------|
|int8|varchar|varchar|varchar|int4|int4|numeric|varchar|numeric|varchar|

Indexes on: `(id)` | `(owner)`

***

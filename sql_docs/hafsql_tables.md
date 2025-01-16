---
icon: apps
order: 96
---
# HafSQL Tables

This category includes the tables with parsed data such as account balances and account details.
The listed views also have corresponding tables but are not listed here. It is recommended to use the views.

***

<!-- To get the columns and their type: -->
<!-- SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'hafsql' 
    AND table_name = $1 -->

### 1. accounts
```sql
SELECT * FROM hafsql.accounts
LIMIT 1
```
|id|name|block_num|last_vote_time|last_root_post|last_post|total_posts|followers|followings|reputation|incoming_vests|incoming_hp|outgoing_vests|outgoing_hp|creator|created_at|owner|active|posting|memo_key|json_metadata|posting_metadata|last_update|last_owner_update|recovery|reward_hive_balance|reward_hbd_balance|reward_vests_balance|reward_vests_balance_hp|next_vesting_withdrawal|to_withdraw|vesting_withdraw_rate|withdrawn|withdraw_routes|proxy|pending_hive_savings_withdrawal|pending_hbd_savings_withdrawal|
|--|----|---------|--------------|--------------|---------|-----------|---------|----------|----------|--------------|-----------|--------------|-----------|-------|----------|-----|------|-------|--------|-------------|----------------|-----------|-----------------|--------|-------------------|------------------|--------------------|-----------------------|-----------------------|-----------|---------------------|---------|---------------|-----|-------------------------------|------------------------------|
|int4|varchar|int4|timestamp|timestamp|timestamp|int8|int8|int8|numeric|numeric|numeric|numeric|numeric|varchar|timestamp|jsonb|jsonb|jsonb|varchar|jsonb|jsonb|timestamp|timestamp|varchar|numeric|numeric|numeric|numeric|timestamp|numeric|numeric|numeric|jsonb|varchar|numeric|numeric|

Indexes on: `(active)` | `(created_at)` | `(creator)` | `(json_metadata)` | `(id)` | `(memo_key)` | `(name)` | `(owner)` | `(posting)` | `(posting_metadata)` | `(proxy)` | `(recovery)` | `(withdraw_routes)`

***
### 2. balances
```sql
SELECT * FROM hafsql.balances
LIMIT 1
```
|account_id|account_name|hive|hbd|vests|hp_equivalent|hive_savings|hbd_savings|
|----------|------------|----|---|-----|-------------|------------|-----------|
|int4|varchar|numeric|numeric|numeric|numeric|numeric|numeric|

Indexes on: `(hive, hbd_savings, hive_savings, vests, hbd)` | `(hbd)` | `(hbd_savings)` | `(hive)` | `(hive_savings)` | `(account_*)` | `(vests)`

***
### 3. balances_history
```sql
SELECT * FROM hafsql.balances_history
LIMIT 1
```
|account_id|account_name|block_num|hive|hbd|vests|hp_equivalent|hive_savings|hbd_savings|
|----------|------------|---------|----|---|-----|-------------|------------|-----------|
|int4|varchar|int4|numeric|numeric|numeric|numeric|numeric|numeric|

Indexes on: `(account_*, block_num)` | `(block_num)`

***
### 4. blacklist_follows
```sql
SELECT * FROM hafsql.blacklist_follows
LIMIT 1
```
|account_id|blacklist_id|account_name|blacklist_name|
|----------|------------|------------|--------------|
|int4|int4|varchar|varchar|

Indexes on: `(account_*, blacklist)`

***
### 5. blacklists
```sql
SELECT * FROM hafsql.blacklists
LIMIT 1
```
|blacklister_id|blacklisted_id|blacklister_name|blacklisted_name|
|--------------|--------------|----------------|----------------|
|int4|int4|varchar|varchar|

Indexes on: `(blacklister_*, blacklisted_*)`

***
### 6. comments
```sql
SELECT * FROM hafsql.comments
LIMIT 1
```
|id|title|body|author|permlink|parent_author|parent_permlink|category|created|last_edited|cashout_time|remaining_till_cashout|last_payout|tags|category|json_metadata|root_author|root_permlink|pending_payout_value|author_rewards|author_rewards_in_hive|total_payout_value|curator_payout_value|beneficiary_payout_value|beneficiaries|max_accepted_payout|percent_hbd|allow_votes|allow_curation_rewards|deleted|
|--|-----|----|------|--------|-------------|---------------|--------|-------|-----------|------------|----------------------|-----------|----|--------|-------------|-----------|-------------|--------------------|--------------|----------------------|------------------|--------------------|------------------------|-------------|-------------------|-----------|-----------|----------------------|-------|
|int4|varchar|varchar|varchar|varchar|varchar|varchar|varchar|timestamp|timestamp|timestamp|interval|timestamp|jsonb|text|jsonb|varchar|varchar|numeric|numeric|numeric|numeric|numeric|numeric|text|numeric|int2|bool|bool|bool|

Indexes on: `(id)` | `(author, permlink)` | `(root_author, root_permlink)` | `(root_permlink)` | `(author, id)` | `(category, id)` | `(pending_payout_value)` | `(tags)` | `(parent_author, parent_permlink)` | `(parent_permlink)` | `(((metadata ->> 'content_type'::text)))` | `(created)` | `(author, created)`

***
### 7. community_roles
```sql
SELECT * FROM hafsql.community_roles
LIMIT 1
```
|account_id|community_id|account_name|community_name|role|title|
|----------|------------|------------|--------------|----|-----|
|int4|int4|varchar|varchar|text|varchar|

Indexes on: `(account_*, community_*)`

***
### 8. community_subs
```sql
SELECT * FROM hafsql.community_subs
LIMIT 1
```
|account_id|community_id|account_name|community_name|
|----------|------------|------------|--------------|
|int4|int4|varchar|varchar|

Indexes on: `(account_*, community_*)`

***
### 9. delegations
```sql
SELECT * FROM hafsql.delegations
LIMIT 1
```
|delegator|delegatee|vests|hp_equivalent|timestamp|
|---------|---------|-----|-------------|---------|
|varchar|varchar|numeric|numeric|timestamp|

Indexes on: `(delegator, delegatee)` | `(delegatee, timestamp)` | `(delegator, timestamp)`

***
### 10. dynamic_global_properties
```sql
SELECT * FROM hafsql.dynamic_global_properties
LIMIT 1
```
|block_num|timestamp|total_vesting_fund_hive|total_vesting_shares|total_reward_fund_hive|virtual_supply|current_supply|current_hbd_supply|hbd_interest_rate|dhf_interval_ledger|vests_per_hive|
|---------|---------|-----------------------|--------------------|----------------------|--------------|--------------|------------------|-----------------|-------------------|--------------|
|int4|timestamp|text|text|text|text|text|text|text|text|numeric|

Indexes on: `(block_num)` | `(timestamp)`

***
### 11. follows
```sql
SELECT * FROM hafsql.follows
LIMIT 1
```
|follower_id|following_id|follower_name|following_name|
|-----------|------------|-------------|--------------|
|int4|int4|varchar|varchar|

Indexes on: `(follower_*, following_*)` | `(following_*)`

***
### 12. mute_follows
```sql
SELECT * FROM hafsql.mute_follows
LIMIT 1
```
|account_id|mute_list_id|account_name|mute_list_name|
|----------|------------|------------|--------------|
|int4|int4|varchar|varchar|

Indexes on: `(account_*, mute_list_*)`

***
### 13. mutes
```sql
SELECT * FROM hafsql.mutes
LIMIT 1
```
|muter_id|muted_id|muter_name|muted_name|
|--------|--------|----------|----------|
|int4|int4|varchar|varchar|

Indexes on: `(muter_*, muted_*)`

***
### 14. rc_delegations
```sql
SELECT * FROM hafsql.rc_delegations
LIMIT 1
```
|delegator|delegatee|rc|hp_equivalent|timestamp|
|---------|---------|--|-------------|---------|
|varchar|varchar|varchar|numeric|timestamp|

Indexes on: `(delegator, delegatee)` | `(delegatee, timestamp)` | `(delegator, timestamp)`

***
### 15. reblogs
```sql
SELECT * FROM hafsql.reblogs
LIMIT 1
```
|account_id|post_id|account_name|author|permlink|
|----------|-------|------------|------|--------|
|int4|int8|varchar|varchar|varchar|

Indexes on: `(account_*, post_id)` | `(post_id)` | `(author, permlink)`

***
### 16. reputations
```sql
SELECT * FROM hafsql.reputations
LIMIT 1
```
|account_id|account_name|reputation|is_implicit|rep|
|----------|------------|----------|-----------|---|
|int4|varchar|int8|bool|numeric|

Indexes on: `(account_*)`
***
### 17. total_balances
```sql
SELECT * FROM hafsql.total_balances
LIMIT 1
```
|block_num|hive|hbd|vests|hp_equivalent|hive_savings|hbd_savings|
|---------|----|---|-----|-------------|------------|-----------|
|int4|numeric|numeric|numeric|numeric|numeric|numeric|

Indexes on: `(block_num)`

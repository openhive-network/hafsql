---
icon: rows
order: 95
---

# HAF Tables
HafSQL also provides access to the tables from HAF. The following views are wrappers around irreversible HAF tables.

***
### 1. haf_account_operations
Used for account history.
```sql
SELECT * FROM hafsql.haf_account_operations
LIMIT 1
```
|account_id|account_name|account_op_seq_no|operation_id|op_type_id|
|----------|------------|-----------------|------------|----------|
|int4|varchar|int4|int8|int4|

Indexes on: `(account_*, op_type_id)` | `(account_*, account_op_seq_no)`

***
### 2. haf_applied_hardforks
```sql
SELECT * FROM hafsql.haf_applied_hardforks
```
|hardfork_num|block_num|hardfork_vop_id|
|------------|---------|---------------|
|int2|int4|int8|

Indexes on: `(block_num)` | `(hardfork_num)`

***
# 3. haf_blocks
```sql
SELECT * FROM hafsql.haf_blocks
LIMIT 1
```
|block_num|timestamp|witness|extensions|signing_key|hash|prev|signature|transaction_merkle_root|
|---------|---------|-------|----------|-----------|----|----|---------|-----------------------|
|int4|timestamp|int4|jsonb|text|text|text|text|text|

Indexes on: `(timestamp)` | `(witness)` | `(block_num)`

***
# 4. haf_operation_types
```sql
SELECT * FROM hafsql.haf_operation_types
```
|id|name|is_virtual|
|--|----|----------|
|int2|text|bool|

Indexes on: `(id)` | `(name)`

***
# 5. haf_operations
```sql
SELECT * FROM haf_operations
LIMIT 1
```
|id|block_num|trx_in_block|op_pos|op_type_id|timestamp|body|included_trx_id|
|--|---------|------------|------|----------|---------|----|---------------|
|int8|int4|int2|int4|int4|timestamp|jsonb|text|

Indexes on: `(block_num, id)` | `(block_num, trx_in_block, op_type_id)` | `(op_type_id, block_num)` | `(id)` | `(op_type_id, id)`

***
# 6. haf_transactions
```sql
SELECT * FROM haf_transactions
LIMIT 1
```
|block_num|trx_in_block|trx_hash|trx_id|ref_block_num|ref_block_prefix|expiration|signatures|
|---------|------------|--------|------|-------------|----------------|----------|----------|
|int4|int2|bytea|text|int4|int8|timestamp|_text (array)|

Indexes on: `(block_num, trx_in_block)` | `(trx_hash)`























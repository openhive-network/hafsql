---
icon: tools
order: 98
---

# Helper Functions
Useful functions to make life easier. PostgreSQL clients like DBeaver can also list the available functions for you.
***
### asset_amount(text)
Returns asset amount (text) from the NAI object (text)
```sql
SELECT hafsql.asset_amount('{"nai": "@@000000021", "amount": "1000", "precision": 3}')
-- 1
```
***
### asset_symbol(text)
Returns asset symbol (text) from the NAI object (text)
```sql
SELECT hafsql.asset_symbol('{"nai": "@@000000021", "amount": "1000", "precision": 3}')
-- HIVE
```
***
### is_json(text)
Returns TRUE for valid JSONB object (text) otherwise FALSE
```sql
SELECT hafsql.is_json('{"test": "test"}')
-- TRUE
```
***
### to_json(text)
Cast text to JSONB - Handles the error and returns `{}` for invalid JSON text.
JSONB string (although considered valid by PostgreSQL) is considered invalid in this function i.e. `'"test"'`
```sql
SELECT hafsql.to_json('"test"')
-- {}
```
***
### vests_to_hive(numeric, int4 default NULL)
Return HIVE equivalent (numeric) of the VESTS (numeric) optionally at certain block number (int4) as a historical value.
```sql
SELECT hafsql.vests_to_hive(1000000) -- at head block
-- 588.960

SELECT hafsql.vests_to_hive(1000000, 50000) -- at block 50000
-- 1000000.000
```
***
### rc_to_hive(numeric, int4 default NULL)
Returns HIVE (numeric) equivalent of RC (numeric) optionally at certain block number (int4).
```sql
SELECT hafsql.rc_to_hive(10000000000) -- at head block
-- 5.890

SELECT hafsql.rc_to_hive(10000000000, 50000) -- at block 50000
-- 10000.000
```
***
### get_trx_id(int8)
Returns transaction id (text) from the operation id (int8).
```sql
SELECT hafsql.get_trx_id(690587791523849)
-- 3c1eae5754cc4f70cf0efb12f9e4f9671a8df2a0
```
***
### last_op_id_from_block_num(int4)
Returns the highest operation id (numeric) existing inside a block.  
Can be used to filter operations based on block number.
```sql
SELECT hafsql.last_op_id_from_block_num(5000000)
-- 21474836480000832
```
!!!
In any given block, there can be multiple operations. So for example, if you want all the operations
that happened after a certain block_num, you would want to get the highest id. `WHERE id > hafsql.last_op_id_from_block_num(num)`  
But if you want to also include the operations that happened at that block, you want the lowest id. `WHERE id >= hafsql.first_op_id_from_block_num(num)`  

And it would be the other way around for operations that happened before a certain block_num. i.e. if it was `id <` instead of `id >`
!!!
***
### first_op_id_from_block_num(int4)
Returns the lowest operation id (numeric) existing inside a block.  
Can be used to filter operations based on block number.
```sql
SELECT hafsql.first_op_id_from_block_num(5000000)
-- 21474836480000009
```
!!!
Check the note above this function.
!!!
***
### parse_reputation(int8)
Parse the reputation number into the more user-friendly representation (numeric).
```sql
SELECT hafsql.parse_reputation(1000000000000000)
-- 79.00
```
***
### get_balance(text | int4, int4 default NULL)
Returns the account balances (numerics) optionally at certain block number as a historical value.
Takes either username or user id.
```sql
SELECT * FROM hafsql.get_balance('gtg')
SELECT * FROM hafsql.get_balance('gtg', 5000000)
-- hive |hbd  |vests          |hp_equivalent|hive_savings|hbd_savings|
-- -----+-----+---------------+-------------+------------+-----------+
-- 0.000|3.465|17579100.476774|     5852.200|       0.000|      0.000|
```
***
### id_from_timestamp(timestamp, highest boolean default FALSE)
Returns the highest/lowest operation id from timestamp depending on the second argument.  
Can be used to filter operations based on timestamp.
```sql
SELECT hafsql.id_from_timestamp('2024-11-19 06:12:24.000') -- lowest
-- 390044641782661159

SELECT hafsql.id_from_timestamp('2024-11-19 06:12:24.000', TRUE) -- highest
-- 390044641782666816
```
!!!
In any given timestamp, i.e. one block, there can be multiple operations. So for example, if you want all the operations
that happened after a certain timestamp, you would want to get the highest id. `WHERE id > id_from_timestamp(time, true)`  
But if you want to also include the operations that happened at that timestamp, you want the lowest id. `WHERE id >= id_from_timestamp(time)`  

And it would be the other way around for operations that happened before a certain timestamp. i.e. if it was `id <` instead of `id >`
!!!
***
### get_timestamp(operation_id int8)
Returns timestamp from operation id.
```sql
SELECT hafsql.get_timestamp(390044641782666816)
-- 2024-11-19 06:12:24.000
```

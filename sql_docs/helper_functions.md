---
icon: tools
order: 98
---

# Helper Functions
Useful functions to make life easier. PostgreSQL clients like DBeaver can also list the available functions for you.
***
### asset_amount(text)
Returns asset amount (numeric) from the NAI object (text)
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
Returns TRUE if the text is a valid JSON object, otherwise FALSE (arrays, strings and numbers are FALSE)
```sql
SELECT hafsql.is_json('{"test": "test"}')
-- TRUE
```
***
### to_json(text)
Cast text to JSONB - Handles the error and returns `{}` for anything that is not a JSON object.
Invalid JSON, but also valid JSON arrays, strings and numbers (i.e. `'"test"'`), return `{}`
```sql
SELECT hafsql.to_json('"test"')
-- {}
```
***
### vests_to_hive(numeric, int4 default NULL)
Return HIVE equivalent (numeric) of the VESTS (numeric) optionally at certain block number (int4) as a historical value.
```sql
SELECT hafsql.vests_to_hive(1000000) -- at head block (changes over time)
-- 622.364

SELECT hafsql.vests_to_hive(1000000, 50000) -- at block 50000
-- 1000000.000
```
***
### rc_to_hive(numeric, int4 default NULL)
Returns HIVE (numeric) equivalent of RC (numeric) optionally at certain block number (int4).
```sql
SELECT hafsql.rc_to_hive(10000000000) -- at head block (changes over time)
-- 6.224

SELECT hafsql.rc_to_hive(10000000000, 50000) -- at block 50000
-- 10000.000
```
***
### get_trx_id(int8)
Returns transaction id (text) from the operation id (int8).
```sql
SELECT hafsql.get_trx_id(390044641782661141)
-- 77c98007ca62c7e39d8f9f21a5372544c86026dc
```
***
### last_op_id_from_block_num(int4)
Returns the highest operation id (numeric) existing inside a block.  
Can be used to filter operations based on block number.
```sql
SELECT hafsql.last_op_id_from_block_num(5000000)
-- 21474836480000003
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
-- 21474836480000000
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
-- 390044641782661120

SELECT hafsql.id_from_timestamp('2024-11-19 06:12:24.000', TRUE) -- highest
-- 390044641782661142
```
!!!
In any given timestamp, i.e. one block, there can be multiple operations. So for example, if you want all the operations
that happened after a certain timestamp, you would want to get the highest id. `WHERE id > id_from_timestamp(time, true)`  
But if you want to also include the operations that happened at that timestamp, you want the lowest id. `WHERE id >= id_from_timestamp(time)`  

And it would be the other way around for operations that happened before a certain timestamp. i.e. if it was `id <` instead of `id >`
!!!
!!!warning Time zone
The input is a `timestamptz`. A timestamp without an offset is read in your session's time zone, not UTC.
Blockchain times are UTC, so either include the offset or use a UTC session:
```sql
SELECT hafsql.id_from_timestamp('2024-11-19 06:12:24+00') -- always UTC
-- or
SET TIME ZONE 'UTC';
```
!!!
***
### get_timestamp(operation_id int8 | block_num int4)
Returns the timestamp (UTC) from an operation id or a block number.
```sql
SELECT hafsql.get_timestamp(390044641782661141) -- operation id
-- 2024-11-19 06:12:24+00

SELECT hafsql.get_timestamp(90814345) -- block number
-- 2024-11-19 06:12:24+00
```
***
### hafd.operation_id_to_block_num(id int8)
Get block_num from operation id.
```sql
SELECT hafd.operation_id_to_block_num(390044641782661141)
-- 90814345
```
***
### hafd.operation_id_to_pos(id int8)
Get position of the operation in the block from operation id.
```sql
SELECT hafd.operation_id_to_pos(390044641782661141)
-- 21
```
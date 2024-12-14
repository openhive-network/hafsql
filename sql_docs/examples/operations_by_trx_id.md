---
icon: file
---
# Operations By trx_id
To get the operations by a transaction id, you have to first get `block_num` and `trx_in_block` from the `haf_transactions` view then use those to get the operations from the `haf_operations` view.  

### Transaction
Get the transaction information. (Not including the operations)
```sql
SELECT * FROM hafsql.haf_transactions
WHERE trx_hash = decode('d76a9a470e8a9d7608f50e6fbb05d43c625e4d21', 'hex')
```
|block_num|trx_in_block|trx_hash|trx_id|ref_block_num|ref_block_prefix|expiration|signatures|
|---------|------------|--------|------|-------------|----------------|----------|----------|
|90875064|1|�j�G\u000e��v\b�\u000eo�\u0005�<b^M!|d76a9a470e8a9d7608f50e6fbb05d43c625e4d21|42166|1010744554|2024-11-21 09:03:18.000|{20650f5a728f02c15ee42b4640aafe58163a5a19334741f46bba4aaf131feb83246cb67fe8941d1b74983606914af7bfd765c9e5784f1fe1e64a9d3140af9664e6}|

!!!
Transaction hash is stored as `bytea` by HAF in `trx_hash` and we have to encode/decode when dealing with that column.
The view provides the encoded `trx_id` but you can't filter by that.
!!!

***
### Operations
Get the operations of that transaction. Which happens to be one operation in this case.
```sql
SELECT * FROM hafsql.haf_operations
WHERE block_num = 90875064 AND trx_in_block = 1
```
|id|block_num|trx_in_block|op_pos|op_type_id|timestamp|body|included_trx_id|
|--|---------|------------|------|----------|---------|----|---------------|
|390305427901907218|90875064|1|0|18|2024-11-21 08:53:21.000|{"type": "custom_json_operation", "value": {"id": "ssc-mainnet-hive", "json": "{\"contractName\":\"tokens\",\"contractAction\":\"unstake\",\"contractPayload\":{\"symbol\":\"BEE\",\"quantity\":\"0.00002918\"}}", "required_auths": ["dantrin"], "required_posting_auths": []}}|d76a9a470e8a9d7608f50e6fbb05d43c625e4d21|

***

### Joined as one query
The above but in one query.

```sql
SELECT o.* FROM hafsql.haf_transactions t
JOIN hafsql.haf_operations o
ON o.block_num = t.block_num
AND o.trx_in_block = t.trx_in_block
WHERE trx_hash = decode('d76a9a470e8a9d7608f50e6fbb05d43c625e4d21', 'hex')
```
!!!
Sometimes joining can make a query very slow. Experimenting and checking other ways of running the same query is always the best approach.
!!!

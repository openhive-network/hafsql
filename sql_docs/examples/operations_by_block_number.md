---
icon: file
---
# Operations By Block Number
Get all `account_create` operations within a block range. All other operations are similar.

```sql
SELECT *, hafsql.get_timestamp(id) as timestamp, hive.operation_id_to_block_num(id) as block_num FROM hafsql.operation_account_create_table
WHERE id > hafsql.last_op_id_from_block_num(5000000) -- highest id in the block
AND id < hafsql.first_op_id_from_block_num(5010000) -- lowest id in the block
ORDER BY id DESC
```


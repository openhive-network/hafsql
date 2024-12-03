---
icon: file
---
# Operations By Timestamp
Get all `account_create` operations within a month. See [id_from_timestamp](/helper_functions/#id_from_timestamptimestamp-highest-boolean-default-false) function.
All other operations are similar.

```sql
SELECT *, hafsql.get_timestamp(id) FROM hafsql.operation_account_create_table
WHERE id > hafsql.id_from_timestamp(NOW() AT TIME ZONE 'utc' - INTERVAL '1 month', true)
ORDER BY id DESC
```

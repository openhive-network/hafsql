---
icon: database
order: 99
---

# Database Structure
The public database provides you with access to multiple HAF applications including HAF itself. Each application usually comes with one or multiple schemas. HafSQL has only one schema `hafsql`. It is recommended to explore all the apps/schemas.

- hivemind has data related to posts, votes, communities, etc
- hafbe has block explorer stuff including witness and proxy data
- hafbe_bal has balance data


## HafSQL
There are two types of tables in HafSQL:
- Operations
- Parsed data

### Operations
These tables are the Hive operations with some parsing done on their parameters. There is a table for each existing operation. (except for 4 operations that have `views` instead)  
  
These tables are recognizable by their names:
```ts
operation_*_table
```
For example:
```ts
operation_account_create_table
operation_transfer_table
operation_fill_order_table
```
This includes real operations and virtual operations.  
  
The following operations have `views` instead:
```ts
operation_custom_json_view
operation_vote_view
operation_comment_view
operation_effective_comment_vote_view
```
  
There should be no difference in how you run your queries against a table or a view. But they will be listed under different categories in your database client.

### Parsed data
For things like `delegations` or `reputations`, we have to parse the data from operations to get the final value. So we need separate tables for them. You can use the tables, but we have created views for them as well to make them more user-friendly. For example `delegations_table` doesn't include the HP (Hive Power) values and only includes the VESTS. So we created `delegations` view which has the HP values as well. Thus, it is recommended to use a view over a table if it exists.
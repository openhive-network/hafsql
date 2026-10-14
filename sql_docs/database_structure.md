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
For things like `comments` or `accounts`, the final value has to be parsed from many operations.
HafSQL keeps its own tables for those (`*_table`) and exposes them through `views` that add
user-friendly values like HP equivalents. It is recommended to use a view over a table if it exists.

Some views are built on top of other HAF applications running on the same database instead of
HafSQL's own tables:

| HafSQL view | Data from |
| --- | --- |
| `balances`, `balances_history`, `total_balances`, `delegations`, `rc_delegations` | balance tracker (`hafbe_bal`) |
| `accounts` (reward balances, power down, proxy) | balance tracker (`hafbe_bal`) and HAF block explorer (`hafbe_app`) |
| `proposal_approvals` | HAF block explorer (`hafbe_app`) |
| `follows`, `mutes`, `blacklists`, `reblogs`, `community_subs`, `community_roles` | hivemind (`hivemind_app`) |
| `reputations` | reputation tracker (`reptracker_app`) |

!!!
`balances_history` is computed per balance change. Always filter it by account **and** a `block_num` range,
otherwise "latest rows" queries on busy accounts can be slow:
```sql
SELECT * FROM hafsql.balances_history
WHERE account_name = 'gtg' AND block_num BETWEEN 90000000 AND 90100000
ORDER BY block_num
```
!!!

---
icon: rocket
order: 100
---

# Getting Started
This documentation is hosted on https://mahdiyari.gitlab.io/hafsql

### Connection settings
The "official" public HafSQL/HAF database:
> host: `hafsql.mahdiyari.info`  
port: `5432`  
database: `haf_block_log`  
user: `hafsql_public`  
password: `hafsql_public`  

### Important notes

!!!
Please consider optimizing your query if it is running slow or timing out. Also consider opening an [:icon-link-external: issue](https://gitlab.com/mahdiyari/hafsql)
so we can improve the speed of that type of query.
!!!

!!!
It is recommended to use the REST APIs as much as possible instead of direct SQL queries.
The REST APIs will be supported on multiple public API nodes and will provide more reliability.  
If your needs are not satisfied by the REST APIs, please consider opening an [:icon-link-external: issue](https://gitlab.com/mahdiyari/hafsql).
!!!

!!!
HafSQL only handles the irreversible data. This doesn't have any meaningful impacts in practice as Hive blocks become irreversible within a second.
!!!

!!!
Sometimes joining can make a query very slow. Experimenting and checking other ways of running the same query is usually the best approach.
!!!

!!!
Be aware of using `OR` in the conditions of a query. The same goes for `=ANY()` or `IN ()`. PostgreSQL will sometimes skip using indexes and make the query very slow.
The solution here is to use `UNION [ALL]` instead.  

:icon-x: Bad:
```sql
SELECT * FROM x WHERE a = 1 OR a = 2
```
```sql
SELECT * FROM x WHERE a IN (1, 2)
```
:icon-check: Good:
```sql
SELECT * FROM x WHERE a = 1
UNION ALL
SELECT * FROM x WHERE a = 2
```
!!!

!!!
**Sometimes** using a `LIMIT` or a very low `LIMIT` in your queries can slow down the query. This is a limitaion of the PostgreSQL query planner.
For more information check out ["LIMIT considered harmful"](https://x.com/Xof/status/1413542818673577987) by CEO of PostgreSQL.  
This doesn't mean you shouldn't use `LIMIT`. Use `LIMIT` but when your query is slow, make sure it is not because of the `LIMIT`.
!!!

### How to connect
HAF is running on PostgreSQL and all the PostgreSQL clients will connect and work just fine. Below is a list of clients that we use.

#### GUI
[:icon-link-external: DBeaver](https://dbeaver.io/download/) provides a very rich user interface with a lot of features.  
It is available for Windows, Linux, and Mac for free.  
Recommendation would be to use DBeaver for testing your queries before implementing them in your code.

#### NodeJS
[:icon-link-external: node-postgres](https://node-postgres.com/) - Solid library with a lot of features

#### Deno
[:icon-link-external: deno-postgres](https://deno.land/x/postgres) - HafSQL is built using this library  
Regular npm packages such as [:icon-link-external: node-postgres](https://node-postgres.com/) should also work fine.
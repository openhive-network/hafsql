---
icon: rocket
order: 100
---

# Getting Started
This documentation is hosted on https://mahdiyari.gitlab.com/hafsql

### Connection settings
The "official" public HafSQL/HAF database:
> host: `hafsql.mahdiyari.info`  
port: `5432`  
database: `haf_block_log`  
user: `hafsql_public`  
password: `hafsql_public`  

!!!
Please consider optimizing your query if it is running slow or timing out. Also consider opening an [:icon-link-external: issue](https://gitlab.com/mahdiyari/hafsql)
so we can improve the speed of that type of query.
!!!

!!!
We recommend using the REST APIs as much as possible instead of direct SQL queries.
The REST APIs will be supported on multiple public API nodes and will provide more reliability.  
If your needs are not satisfied by the REST APIs, please consider opening an [:icon-link-external: issue](https://gitlab.com/mahdiyari/hafsql).
!!!

### How to connect
HAF is running on PostgreSQL and all the PostgreSQL clients will connect and work just fine. Below is a list of clients that we use.

#### GUI
[:icon-link-external: DBeaver](https://dbeaver.io/download/) provides a very rich user interface with a lot of features.  
It is available for Windows, Linux, and Mac for free.  
We recommend using DBeaver for testing your queries before implementing them in your code.

#### NodeJS
[:icon-link-external: node-postgres](https://node-postgres.com/) - Solid library with a lot of features

#### Deno
[:icon-link-external: deno-postgres](https://deno.land/x/postgres) - HafSQL is built using this library  
Regular npm packages such as [:icon-link-external: node-postgres](https://node-postgres.com/) should also work fine.
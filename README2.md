# HafSQL
This version is compatible with HAF 1.27.6rc9 - For production wait for HAF 1.27.6

### Documentation
- [SQL Documentations](https://mahdiyari.gitlab.com/hafsql)
- API Documentations: [hafsql-api](https://hafsql-api.mahdiyari.info) - Any node running HafSQL will serve them

***
## How to run

### Option 1: If you already have HAF running
The following command will start the HafSQL docker container and serve the API and documentations on port 3000.  
The container will check and wait for HAF to be ready before processing the data.  

To include [environment variables](#options):
```sh
cp .env.defaults .env
# Edit .env
# Then
docker run -itd --env-file .env -p 3000:3000 --name hafsql mahdiyari/hafsql:latest
```
Make sure the IP address on `HAFSQL_PGHOST` is correct. You can find the correct IP address by:
```sh
docker inspect \
  -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' container_name_or_id
```

> Note: HafSQL needs `haf_admin` pg_hba entry. Example:
```
host haf_block_log all 172.0.0.0/8 trust
```


### Option 2: Run only HAF + HafSQL
The following docker compose repository will setup both HAF and HafSQL with one command:  
[HAF Dockers](https://gitlab.com/mahdiyari/haf_dockers)

## Uninstall
To remove HafSQL just provide the `purge` argument:
```sh
docker run -it --rm --env-file .env mahdiyari/hafsql:latest purge
```
It will remove everything related to HafSQL and exit.


### Requirements
HafSQL:  
400GB of compressed storage space (ZFS LZ4)  
8GB of free RAM  
  

### Options
The following environment variables are available as described in `.env.defaults`.
You can use --env or --env-file while running the docker container to pass the varibales.

```conf
# Default haf values
# Shouldn't need to change any except the PGHOST in case of different IP address
HAFSQL_PGDATABASE=haf_block_log
HAFSQL_PGUSER=haf_admin
HAFSQL_PGHOST=172.17.0.2
HAFSQL_PGPORT=5432
HAFSQL_PGPOOLSIZE=5 # lazy - must be >= 3

HAFSQL_INDEXMAXTHREADS=8

# Modular syncing
# Don't modify if providing a public API node
# The followings are useful for people who want to run a very minimal instance
# Set to false to skip syncing that table
HAFSQL_BALANCES=true
HAFSQL_ACCOUNTS=true
HAFSQL_FOLLOWS=true # follows, mutes, blacklists
HAFSQL_COMMUNITIES=true
HAFSQL_RC_DELEGATIONS=true
HAFSQL_DELEGATIONS=true
HAFSQL_PROPOSALS=true
HAFSQL_COMMENTS=true
HAFSQL_REBLOGS=true # depends on HAFSQL_COMMENTS
HAFSQL_REWARDS=true # depends on HAFSQL_COMMENTS
HAFSQL_REPUTATIONS=true # depends on HAFSQL_COMMENTS

# Operation filtering is already avilable directly on HAF
# so the above should be enough

# Creates hafsql_public role and grant SELECT on hafsql views
# user: hafsql_public - password: hafsql_public
# pg_hba entry: host haf_block_log hafsql_public all md5
# Would recommend leaving unchanged
HAFSQL_PUBLICUSER=true
```

## Development
- APIs are located in `/src/api/routes`  
- New APIs must be imported in `/src/api/mod.ts`  
- API documentation UI is in `/src/api/ui/scalar.ts`  
- SQL views are located in `/src/app/setup/extra_views.ts` and `setup_operation_views.ts`  
- SQL functions are in `/src/app/setup/functions.ts`  
- Breaking schema changes must be handled in `src/upgrade.ts`  
- Version must be updated in `deno.json`  
- SQL docs are built by gitlab - just edit md files in `sql_docs`  
  
Open issues for feedback or requests.
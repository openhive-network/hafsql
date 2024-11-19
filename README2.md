Environment variables can be passed by `.env` file when building the docker image or by `--env` when running the container. `--env` will override the variables provided with `.env` file.



Retype for docs
Scaler for api docs (using danet)


### Documentation
http://

***
## How to run

The following command will start the HafSQL docker container and start the API on port 3000.  
The container will check and wait for HAF to be ready before processing the data.
```sh
docker run -itd --env-file .env -p 3000:3000 --name hafsql mahdiyari/hafsql:latest
```

> Note: HafSQL needs `haf_admin` pg_hba entry. Example:
```
host haf_block_log all 172.0.0.0/8 trust
```
Don't worry about the pg_hba entry unless you get an error about it.


### Requirements
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
APIs are located in `/src/api/routes`  
New APIs must be imported in `/src/api/mod.ts`  

API documentation UI is in `/src/api/ui/scalar.ts`  
  
SQL views are located in `/src/app/setup/extra_views.ts` and `setup_operation_views.ts`  
  
SQL functions are in `/src/app/setup/functions.ts`  

Open issues for feedback or requests.
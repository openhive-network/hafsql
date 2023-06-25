# HafSQL

Space used by indexes +400GB (non-compressed)
Space used by tables 56GB

## What is HafSQL
HafSQL is a HAF application that runs inside the HAF database. It will run on the `hafsql` schema inside the HAF database.  
  
HafSQL provides the following using the data already present in the HAF database:
- All the operations (50 in total)
- - Votes, Comments, Transfers, ...
- All the virtual operations (43 in total)
- Ability to search all the operations by their parameters  
  

HafSQL also provides the following additional parsed data:
- Posts and comments
- - Search by `author` and `permlink` or `parent_author` and `parent_permlink`
- - Search by tags
- - Sort by pending payout
- Reblogs
- HP and RC delegations
- Community subs and roles
- Followers
- Mutes + Mute followers
- Blacklists + Blacklist followers
- Proposal voters  


## How to run:

#### Requirements
Ubuntu 22  
Nodejs v18  
HAF 1.27.4  
  

```bash
git clone https://gitlab.com/mahdiyari/hafsql
```
  
To install node.js v18 on Ubuntu 22:
```bash
./run.sh install_node
```

Install dependencies:
```bash
npm install
```

#### Preperations
You need to have a line for `haf_admin` in you pg_hba.conf to create the indexes. Assuming you are using dockerized haf, the following is the easiest way of doing so.
```bash
cd haf-data-dir
mkdir -p haf_postgresql_conf.d
cd haf_postgresql_conf.d
touch custom_postgres.conf
touch custom_pg_hba.conf
```

`custom_postgres.conf`:  
**DON'T EDIT THE PATH**  
```conf
hba_file = '/home/hived/datadir/haf_postgresql_conf.d/custom_pg_hba.conf' # Don't change
```

`custom_pg_hba.conf`:
```conf
# Necessary for HafSQL index creation - can be removed afterwards
host    haf_block_log     haf_admin    172.0.0.0/8    trust

# Defaults included with dockerized setup
host    haf_block_log     haf_app_admin    172.0.0.0/8    trust
host    all     pghero    172.0.0.0/8    trust

# DO NOT DISABLE!
# If you change this first entry you will need to make sure that the
# database superuser can access the database using some other method.
# Noninteractive access to all databases is required during automatic
# maintenance (custom daily cronjobs, replication, and similar tasks).
#
# Database administrative login by Unix domain socket
local   all             postgres                                peer
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# "local" is for Unix domain socket connections only
local   all             all                                     peer
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5
```

Restart the container and you should be good to go.

##### STEP 1
Create `.env` file from `example.env` and edit if necessary.
```bash
cp example.env .env
```

Depending on your situation, you can create indexes in two ways.

1. CONCURRENTLY=true  
Creating indexes will not interrupt the live sync of the HAF/hived node. Your node will be running just fine.  
It is slower compared to the second option and will take longer.  
This is the default option.

2. CONCURRENTLY=false  
The live sync of the HAF/hived will be paused. Other than that, there shouldn't be any other interruptions.  
hived will continue syncing just fine after the index creation.  
It is faster in creating the indexes.  
  

After deciding your method in .env file, you can create the indexes.  
  
Note: It is recommended to run the following command inside a `tmux` or `screen` session because it will take a long time.  
```bash
npm run create-indexes
```
  

##### STEP 2

Start HafSQL:
```bash
npm run start
```
HafSQL will finish syncing in couple of hours. You can check the logs for its progress.  

See logs:
```bash
npm run logs
```

To stop:
```bash
npm run stop
```

To restart:
```bash
npm run restart
```

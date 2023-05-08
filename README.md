# HafSQL

Space used by indexes: 185GB (non-compressed)


#### Requirements
Ubuntu 22  
Nodejs v18  

To install node.js v18 on Ubuntu 22:
```bash
./run.sh install_node
```

Install dependencies:
```bash
npm install
```

Depending on your situation, you can create indexes in two ways.

1. On a live haf node (hived syncing)  
This is the default behaviour of the code responsible for index creation. 
You can safely do this on a live node but it will take longer time to finish.  
Note: This "might" still slightly affect the performance of the running applications.  
Around 10 hours.  


2. On a offline haf node (hived paused)  
Make sure hived is not running. See the advanced section bellow.  
You have to set `CONCURRENTLY` to `false` in `.env` file.  
This will lock the `hive.operations` table and will be a lot faster in expense of pausing the hived.  
Around 3.5 hours.  

The above numbers are from i9-13900, ZFS+LZ4 on raid0 NVMe, 12 parallel workers


Step 1:  
You need to have a line for `haf_admin` in you pg_hba.conf to create the indexes. Assuming you are using dockerized haf, the following is the easiest way of doing so.

```bash
cd haf-data-dir
mkdir -p haf_postgresql_conf.d
cd haf_postgresql_conf.d
touch custom_postgres.conf
touch custom_pg_hba.conf
```

`custom_postgres.conf`:
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
Have to restart the container.  

With `haf_admin` access, you can run the following command:  
(Run inside tmux or screen session - will take a long time)  

```bash
node src/mergedIndexes.js
```

Copy `example.env` to `.env` and edit if necessary. Default values should work out of the box.  


Step 2:  

To create the views and `hafsql` schema:  
```bash
node src/setup.js
```

#### Advanced:  

You can set `CONCURRENTLY` to false in `.env` for a faster index creation but you have to make sure hived is not syncing and your database is not busy. Syncing can be paused by addition of the following arguments:  
```
--stop-replay-at-block=74000000 --replay
```
(It will just pause the sync while postgresql will be running inside the docker. Note: Assuming you are using the dockerized setup.)  



Note:  
On addition of new non-virtual operations during a Hard fork, because the ID of Virtual operations change, the indexes should be recreated with the new operation ids added.

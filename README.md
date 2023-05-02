# HafSQL

How to run:


Step 1:

Run `setup-indexes.sql` file on haf database to create necessary indexes. Needs `haf_admin` access.

You can run this command inside the haf docker container after importing setup-indexes.sql file.
```
$ psql -d haf_block_log -v ON_ERROR_STOP=on -f "setup-indexes.sql"
```

or without docker
```
$ psql postgresql://haf_admin@172.17.0.2/haf_block_log -v ON_ERROR_STOP=on -f "setup-indexes.sql"
```

Step 2:
./run.sh install
./run.sh start

To see logs
./run.sh logs

To stop
./run.sh stop

To restart
./run.sh restart

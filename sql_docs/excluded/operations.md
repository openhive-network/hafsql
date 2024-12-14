# Operations
Every single Hive operation is available here. There are indexes on some of their parameters as well so it is possible to search them by their parameters.
!!!
Indexes work from left to right. For example the index on `(col1, col2, col3)` will work for queries that filter for col1, queries that filter for col1 AND col2, and for the queries that filter for col1 AND col2 AND col3.
!!!

!!!
In all of the listed tables/views the primary key is `id`. Which we call operation id.  
To filter the operations by `block_num`, checkout [this](/helper_functions/#last_op_id_from_block_numint4) and [this](/helper_functions/#first_op_id_from_block_numint4) helper functions.  
To filter the operations by `timestamp`, checkout [this](/helper_functions/#id_from_timestamptimestamp-highest-boolean-default-false) helper function.
!!!

***
Note: The following is auto generated.
***

<!-- deno run docs -->

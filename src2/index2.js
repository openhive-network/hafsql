// select
//     ix.indisvalid
// from
//     pg_class i,
//     pg_index ix
// where
//     i.oid = ix.indexrelid
//     and i.relname = 'hive_account_operations_uq1'

// Check if index exists and is valid

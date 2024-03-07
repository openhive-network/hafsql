import pg from 'pg'
import { config } from 'dotenv'
config()

export const pool = new pg.Pool({
  application_name: 'HafSQL-sync',
  database: process.env.PGDATABASE || 'haf_block_log',
  user: process.env.PGUSER || 'haf_admin',
  host: process.env.PGHOST || '172.17.0.2',
  port: process.env.PGPORT || 5432,
  max: process.env.PGPOOLSIZE || 2,
  min: 1
})

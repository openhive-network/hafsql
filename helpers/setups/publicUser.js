import { config } from 'dotenv'
import pg from 'pg'
config()

export const setupPublicUser = async () => {
  if (process.env.PUBLICUSER === 'true') {
    const pool = new pg.Pool({
      application_name: 'HafSQL-access-manager',
      database: process.env.PGDATABASE || 'haf_block_log',
      user: 'haf_admin',
      host: process.env.PGHOST || '172.17.0.2',
      port: process.env.PGPORT || 5432,
      max: process.env.PGPOOLSIZE || 2,
      min: 1
    })

    const role = await pool.query('SELECT rolname FROM pg_catalog.pg_roles WHERE rolname = $1', ['hafsql_public'])
    if (role.rowCount === 0) {
      await pool.query("CREATE ROLE hafsql_public NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT LOGIN NOREPLICATION NOBYPASSRLS PASSWORD 'hafsql_public';")
    }
    await pool.query('GRANT USAGE ON SCHEMA hafsql TO hafsql_public;')
    await pool.query('GRANT SELECT ON ALL TABLES IN SCHEMA hafsql TO hafsql_public;')
    await pool.query('GRANT ALL ON FUNCTION hive._operation_to_jsonb TO hafsql_public;')
    await pool.query("ALTER USER hafsql_public SET statement_timeout='45s';")
    await pool.query('ALTER USER hafsql_public SET search_path TO hafsql, public;')
    console.log('hafsql_public user setup done')
    pool.end()
  }
}

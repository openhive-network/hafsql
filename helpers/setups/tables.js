import { pool } from '../database.js'

export const setupTables = async () => {
  // Sync data
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.sync_data (
    table_name varchar NOT NULL,
    last_op_id int8 NOT NULL,
    CONSTRAINT hafsql_sync_data_un UNIQUE (table_name)
  );`)
  await setupSyncDataTable()

  // Delegations
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.delegations_table (
    delegator varchar(16) NOT NULL,
    delegatee varchar(16) NOT NULL,
    vests varchar NOT NULL,
    CONSTRAINT hafsql_delegations_table_un UNIQUE (delegator, delegatee)
  );`)
  await pool.query(
    'CREATE INDEX IF NOT EXISTS hafsql_delegations_table_delegatee_idx ON hafsql.delegations_table USING btree (delegatee);'
  )

  // RC Delegations
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.rc_delegations_table (
    delegator varchar(16) NOT NULL,
    delegatee varchar(16) NOT NULL,
    rc varchar NOT NULL,
    CONSTRAINT hafsql_rc_delegations_table_un UNIQUE (delegator, delegatee)
  );`)
  await pool.query(
    'CREATE INDEX IF NOT EXISTS hafsql_rc_delegations_table_delegatee_idx ON hafsql.rc_delegations_table USING btree (delegatee);'
  )

  // Proposal Approvals
  await pool.query(`CREATE TABLE hafsql.proposal_approvals_table (
    id int4 NOT NULL,
    voter varchar(16) NOT NULL,
    CONSTRAINT hafsql_proposal_approvals_table_un UNIQUE (id, voter)
  );`)
}

const setupSyncDataTable = async () => {
  const tableNames = ['delegations', 'rc_delegations', 'proposal_approvals']
  for (let i = 0; i < tableNames.length; i++) {
    const name = tableNames[i]
    const data = await pool.query(
      'SELECT last_op_id FROM hafsql.sync_data WHERE table_name = $1',
      [name]
    )
    if (!data.rowCount) {
      await pool.query(
        'INSERT INTO hafsql.sync_data(table_name, last_op_id) VALUES($1, $2)',
        [name, 0]
      )
    }
  }
}

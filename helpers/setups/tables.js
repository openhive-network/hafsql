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
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.proposal_approvals_table (
    id int4 NOT NULL,
    voter varchar(16) NOT NULL,
    CONSTRAINT hafsql_proposal_approvals_table_un UNIQUE (id, voter)
  );`)

  // Blacklists
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.blacklists_table (
    blacklister int4 NOT NULL,
    blacklisted int4 NOT NULL,
    CONSTRAINT hafsql_blacklists_table_un UNIQUE (blacklister, blacklisted)
  );`)

  // Blacklist Follows
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.blacklist_follows_table (
    account int4 NOT NULL,
    blacklist int4 NOT NULL,
    CONSTRAINT hafsql_blacklist_follows_table_un UNIQUE (account, blacklist)
  );`)

  // Mute
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.mutes_table (
    muter int4 NOT NULL,
    muted int4 NOT NULL,
    CONSTRAINT hafsql_mutes_table_un UNIQUE (muter, muted)
  );`)

  // Mute Follows
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.mute_follows_table (
    account int4 NOT NULL,
    mute_list int4 NOT NULL,
    CONSTRAINT hafsql_mute_follows_table_un UNIQUE (account, mute_list)
  );`)

  // Reblogs
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.reblogs_table (
    account int4 NOT NULL,
    post int8 NOT NULL,
    CONSTRAINT hafsql_reblogs_table_un UNIQUE (account, post)
  );`)

  // Follows
  await pool.query(`CREATE TABLE IF NOT EXISTS hafsql.follows_table (
    follower int4 NOT NULL,
    following int4 NOT NULL,
    CONSTRAINT hafsql_follows_table_un UNIQUE (follower, following)
  );`)
}

const setupSyncDataTable = async () => {
  const tableNames = [
    'delegations',
    'rc_delegations',
    'proposal_approvals',
    'follows'
  ]
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

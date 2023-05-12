import { pool } from "./database.js"

export const setupTables = async () => {
  // Delegations
  await pool.query(`CREATE TABLE hafsql.delegations_table (
    delegator varchar(16) NOT NULL,
    delegatee varchar(16) NOT NULL,
    vests varchar NOT NULL,
    CONSTRAINT hafsql_delegations_table_un UNIQUE (delegator, delegatee)
  );
  CREATE INDEX hafsql_delegations_table_delegatee_idx ON hafsql.delegations_table USING btree (delegatee);`)
  
}

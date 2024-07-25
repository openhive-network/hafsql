import { pool } from "../database.js";

export const setupSchema = async () => {
  const schema = "CREATE SCHEMA IF NOT EXISTS hafsql;";
  await pool.query(schema);
};

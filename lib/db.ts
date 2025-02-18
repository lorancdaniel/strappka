import { Pool } from "pg";

const db = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "8513",
  database: "strappka",
});

export default db;

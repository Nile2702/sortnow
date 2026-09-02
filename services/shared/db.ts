import { Pool } from "pg";

// Single pooled connection to the primary PostgreSQL cluster (ap-south-1).
// RLS session variables (app.current_store_id, app.role) are set per
// transaction by the API Gateway's auth middleware before handing off to
// service code - omitted here since webhook processing runs with an
// elevated service role (no per-request tenant context).
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

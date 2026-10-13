// Singleton Postgres connection pool (Neon), replacing the old
// globalThis-array + lib/persist.ts in-memory/JSON-file data layer. See
// database/schema-live.sql for the schema this pool talks to.
//
// Anchored on `globalThis` for the same reason every mutable store in
// lib/seed-data.ts used to be: Next.js dev-mode compiles route handlers
// on demand, which can give separately-compiled routes their own copy of
// this module until the module graph converges - a plain
// `export const pool = new Pool(...)` could get re-constructed per route,
// opening far more connections than intended. `globalThis` is a true
// process-wide singleton, unaffected by that per-route module
// duplication - the standard "globalThis.prisma" dev-mode trick, applied
// to a raw `pg.Pool` instead of an ORM client.
import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __sioPgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set - see apps/web/.env.local");
  }
  return new Pool({
    connectionString,
    // Neon's pooled connection string already carries sslmode=require;
    // rejectUnauthorized: false avoids local/Node CA-bundle mismatches
    // against Neon's certificate chain, the same relaxation Neon's own
    // node-postgres docs recommend for serverless/edge-adjacent hosts.
    ssl: { rejectUnauthorized: false },
  });
}

export const pool: Pool = globalThis.__sioPgPool ?? (globalThis.__sioPgPool = createPool());

/** Runs a query and returns just the rows, typed as T[]. */
export async function query<T extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query<T>(text, params as any[]);
  return result.rows;
}

/** Runs a query and returns its first row (or undefined), typed as T. */
export async function queryOne<T extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/** Runs a mutation (INSERT/UPDATE/DELETE) and returns the number of affected rows. */
export async function execute(text: string, params?: unknown[]): Promise<number> {
  const result = await pool.query(text, params as any[]);
  return result.rowCount ?? 0;
}

/** Runs `fn` with a single client checked out of the pool inside a transaction - commits on success, rolls back on throw. */
export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

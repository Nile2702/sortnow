// One-off migration: adds everything the site owner's seller
// hold/reinstate tool (app/admin/sellers/active) and product hold/unhold
// tool (app/admin/products) need on top of the live schema - see
// lib/seed-data.ts suspendStore/reinstateStore/holdProduct/unholdProduct
// and database/schema-live.sql. Written against the live Neon database
// named by DATABASE_URL in .env.local, same pattern as
// migrate-pending-review.js and apply-schema.js.
//
//   1. stores.activated_at - when a store most recently became "active"
//      (first approval via activateStore(), or a later reinstateStore()
//      after a suspension). store_status itself already has "suspended" in
//      its enum (added with the original schema, just unused until now),
//      so no enum change is needed there.
//   2. A new product_status enum ('live' | 'on_hold') plus
//      products.status, defaulting every existing row to 'live' so no
//      product is accidentally hidden by this migration.
//
// CREATE TYPE has no IF NOT EXISTS - wrapped in a DO block that swallows
// "already exists" (duplicate_object) so this is safe to re-run, same
// reasoning as the IF NOT EXISTS guards on the ALTER TABLE/ALTER TYPE
// statements below.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ`,
  // Backfill: every store that's already "active" today became active at
  // some point before this column existed - created_at is the closest
  // honest approximation available (better than leaving it NULL, which the
  // admin UI would otherwise show as "unknown" for every pre-existing
  // seller on day one of this feature).
  `UPDATE stores SET activated_at = created_at WHERE status = 'active' AND activated_at IS NULL`,
  `DO $$ BEGIN
     CREATE TYPE product_status AS ENUM ('live', 'on_hold');
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS status product_status NOT NULL DEFAULT 'live'`,
];

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log("OK:", sql.split("\n")[0].trim());
    }
    console.log("Migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});

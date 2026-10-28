// One-off migration: adds backstop CHECK constraints for the two
// TOCTOU/lost-update fixes in lib/seed-data.ts (createReservation/createBill
// now lock and recheck stock inside a transaction before deducting it;
// spendPhotoCredit/buyPhotoCredits/boostStore are now single atomic SQL
// statements instead of read-then-write) - a DB-level guard so a bug in
// that application logic can never actually drive either column negative,
// rather than relying solely on the application getting it right. Written
// against the live Neon database named by DATABASE_URL in .env.local, same
// pattern as migrate-admin-moderation.js/migrate-pending-review.js.
//
// Both CHECK expressions evaluate to NULL (which a CHECK constraint treats
// as satisfied, not violated) for a NULL stock_remaining - products.
// stock_remaining is nullable (an untracked-stock product), so that's
// intentional, not a gap: this only ever rejects an explicit negative
// value, never "stock isn't tracked".
//
// ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS in Postgres, so each
// is wrapped in a DO block that swallows "already exists" (duplicate_object),
// the same re-run-safety pattern migrate-admin-moderation.js already uses
// for its CREATE TYPE statement.
//
// The photo_credits constraint this originally also added here was removed
// (not just skipped) after scripts/migrate-gemini-byok.js dropped that whole
// table - re-running this script today would otherwise fail on "relation
// photo_credits does not exist" (duplicate_object only swallows an
// already-exists error, not a missing-table one). The constraint itself is
// moot now anyway: there's no photo_credits.credits column left to protect.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `DO $$ BEGIN
     ALTER TABLE products ADD CONSTRAINT products_stock_remaining_check CHECK (stock_remaining >= 0);
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$`,
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

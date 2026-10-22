// One-off migration: adds reservations.fulfilled_at, backing the new admin
// customer/footfall analytics page's daily-visits trend. Without this, the
// only timestamp on a reservation is created_at (when it was booked), which
// is the wrong signal for "footfall" - a reservation booked Monday but
// picked up Thursday is a Thursday store visit, not a Monday one. Nullable:
// every reservation fulfilled before this migration has no way to know its
// real pickup time, so those fall back to created_at in application code
// (see getPlatformCustomerStats in lib/seed-data.ts) rather than being
// backfilled with a guess.
// Written against the live Neon database named by DATABASE_URL in
// .env.local, same pattern as the other migrate-*.js scripts here.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ`];

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log("OK:", sql);
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

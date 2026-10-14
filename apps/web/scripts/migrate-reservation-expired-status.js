// One-off migration: adds the "expired" reservation_status value. A
// "pending" reservation past its reservedUntil window is now flipped to
// "expired" in the DB the first time anything reads it (write-on-read, see
// lib/seed-data.ts's flipIfExpired/getReservation/getStoreReservations) -
// without this enum value, that UPDATE ... SET status = 'expired' fails
// against the live Neon database even though the TypeScript ReservationStatus
// type already included "expired". Same pattern as migrate-pending-review.js.
//
// ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
// later statement that uses the new value - this file has only the one
// statement, so that's not an issue here, but IF NOT EXISTS still makes it
// safe to re-run.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [`ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'expired'`];

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

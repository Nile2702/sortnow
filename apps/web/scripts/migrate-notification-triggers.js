// One-off migration: adds the 6 new notification_trigger enum values for
// seller account/listing status change notifications (see
// lib/seed-data.ts activateStore/rejectStore/suspendStore/reinstateStore/
// holdProduct/unholdProduct, which now call notify() the same way
// createReservation already did) - without these, inserting a notification
// row with trigger = 'store_approved' (etc.) fails against the live Neon
// database even though the TypeScript Notification["trigger"] union
// already includes them. Same pattern as
// migrate-reservation-expired-status.js.
//
// ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
// later statement that uses the new value - each runs as its own
// implicit auto-commit statement (no explicit BEGIN/COMMIT wrapping them
// together) - and IF NOT EXISTS makes this safe to re-run.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `ALTER TYPE notification_trigger ADD VALUE IF NOT EXISTS 'store_approved'`,
  `ALTER TYPE notification_trigger ADD VALUE IF NOT EXISTS 'store_rejected'`,
  `ALTER TYPE notification_trigger ADD VALUE IF NOT EXISTS 'store_suspended'`,
  `ALTER TYPE notification_trigger ADD VALUE IF NOT EXISTS 'store_reinstated'`,
  `ALTER TYPE notification_trigger ADD VALUE IF NOT EXISTS 'product_held'`,
  `ALTER TYPE notification_trigger ADD VALUE IF NOT EXISTS 'product_unheld'`,
];

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

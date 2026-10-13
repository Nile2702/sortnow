// One-off migration: adds the "pending_review" store_status value and the
// GSTIN/PAN/UPI columns the seller onboarding flow now submits for manual
// review (see lib/seed-data.ts submitStoreForReview/getStoresPendingReview
// and app/admin/sellers/page.tsx). Written against the live Neon database
// named by DATABASE_URL in .env.local, same pattern as apply-schema.js.
//
// ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
// later statement that uses the new value, so each statement here runs as
// its own implicit auto-commit command (no explicit BEGIN/COMMIT wrapping
// them together) - safe to re-run thanks to IF NOT EXISTS everywhere.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `ALTER TYPE store_status ADD VALUE IF NOT EXISTS 'pending_review'`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS gstin TEXT`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS pan TEXT`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS upi_vpa TEXT`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS submitted_for_review_at TIMESTAMPTZ`,
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

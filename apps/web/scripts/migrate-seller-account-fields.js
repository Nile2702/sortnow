// One-off migration: backs the new seller-facing "Account" page (replacing
// the old one-shot "Onboarding" tab, see app/seller/(dashboard)/account/
// page.tsx) with two columns the onboarding wizard already collected
// ("Legal business name" / "Business type", Step 0) but - per a direct code
// read - never actually sent to the server at all; they were discarded
// React state. Adding real columns for them now that there's a page meant
// to show/edit them, and backfilling nothing (there was never anything to
// backfill - the data was never captured).
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

const statements = [
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_business_name TEXT`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_type TEXT`,
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

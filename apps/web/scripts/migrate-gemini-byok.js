// One-off migration: moves the "Add Mannequin" AI photo step from a shared
// platform Gemini API key (metered via the photo_credits table, sold to
// sellers as fake-priced "packs" with no real payment processor ever wired
// up) to a bring-your-own-key model - each seller supplies their own free
// Gemini API key (lib/seed-data.ts getGeminiApiKey/updateStoreGeminiKey),
// so no money of any kind flows through SORT NOW for this feature anymore.
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
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS gemini_api_key TEXT`,
  `DROP TABLE IF EXISTS photo_credits`,
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

// One-off migration: drops stores.live_sale, now genuinely dead - a store's
// Live Sale badge used to be independently set by hand (setStoreLiveSale/
// clearStoreLiveSale, both removed from lib/seed-data.ts in this same
// change) via the seller dashboard's own form, which meant a seller could
// claim a discount with no real pricing behind it. getAllStores() now
// derives Store.liveSale entirely from whichever sale_campaigns row (see
// scripts/migrate-sale-campaigns.js) is currently active for that store, so
// nothing reads or writes this column anymore. Written against the live
// Neon database named by DATABASE_URL in .env.local, same pattern as the
// other migrate-*.js scripts here.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [`ALTER TABLE stores DROP COLUMN IF EXISTS live_sale`];

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

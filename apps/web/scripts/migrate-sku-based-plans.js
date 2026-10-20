// One-off migration: repricing moved from flat feature-gated plans
// (Lite/Pro/Max) to purely SKU-volume-based ones (Flex/Pro/Max) - see the
// PLANS array and getSubscription() in lib/seed-data.ts. "Lite" no longer
// exists as a sellable plan; its replacement at the entry tier is "Flex"
// (pay-per-listing, no monthly fee), so any existing subscription still on
// "lite" is moved there rather than left pointing at a plan code the app
// no longer recognizes (which would crash the billing page's
// `PLANS.find(...)!`).
//
// ALTER TYPE ... ADD VALUE can't run inside the same transaction as a
// statement that uses the new value (Postgres restriction), so this script
// runs each statement as its own implicit transaction rather than wrapping
// them all in one - same reasoning as the DO-block guards elsewhere in
// these migrate-*.js scripts, just for a different Postgres limitation.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `ALTER TYPE plan_code ADD VALUE IF NOT EXISTS 'flex'`,
  `UPDATE subscriptions SET plan_code = 'flex' WHERE plan_code = 'lite'`,
  `ALTER TABLE subscriptions ALTER COLUMN plan_code SET DEFAULT 'flex'`,
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

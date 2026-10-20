// One-off migration: adds shoppers.google_id, backing "Continue with Google"
// on the shopper /account login page. Nullable + unique (Postgres already
// allows multiple NULLs under a UNIQUE constraint, so shoppers who never use
// Google sign-in are unaffected). Written against the live Neon database
// named by DATABASE_URL in .env.local, same pattern as the other
// migrate-*.js scripts here.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `ALTER TABLE shoppers ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`,
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

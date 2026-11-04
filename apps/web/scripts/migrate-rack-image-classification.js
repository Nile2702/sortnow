// One-off migration: adds the product_image_classification cache table
// backing the homepage's ClothesRackHero (components/ClothesRackHero.tsx,
// app/api/v1/products/rack/route.ts) - caches the result of a one-time
// Gemini vision call that classifies a product's photo as a hanger/flat-lay
// shot vs. a model/lifestyle shot (lib/ai-rack-classify.ts), so the same
// product's photo is never re-classified on a later homepage load. Written
// against the live Neon database named by DATABASE_URL in .env.local, same
// pattern as the other migrate-*.js scripts here.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `CREATE TABLE IF NOT EXISTS product_image_classification (
     product_id         TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
     image_url          TEXT NOT NULL,
     is_hanger_or_flat  BOOLEAN NOT NULL,
     classified_at      TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
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

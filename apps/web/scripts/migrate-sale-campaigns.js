// One-off migration: adds the sale_campaigns table backing the seller's new
// "Promotions" tool (app/seller/(dashboard)/promotions, lib/seed-data.ts
// createSaleCampaign/getSaleCampaignsForStore/applyActiveSales) - a real
// per-product discount, unlike the pre-existing stores.live_sale JSONB
// column, which is purely a cosmetic storefront banner that never touches
// any product's price. Written against the live Neon database named by
// DATABASE_URL in .env.local, same pattern as the other migrate-*.js
// scripts here.
//
// Reuses the existing `gender` enum (men/women/kids) for a category-scoped
// campaign's optional gender column, rather than inventing a parallel type.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const statements = [
  `DO $$ BEGIN
     CREATE TYPE sale_discount_type AS ENUM ('percent', 'flat');
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$`,
  `DO $$ BEGIN
     CREATE TYPE sale_scope AS ENUM ('all', 'category', 'products');
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$`,
  `CREATE TABLE IF NOT EXISTS sale_campaigns (
     id               TEXT PRIMARY KEY,
     store_id         TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
     name             TEXT NOT NULL,
     discount_type    sale_discount_type NOT NULL,
     discount_value   NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
     scope            sale_scope NOT NULL,
     gender           gender,
     sub_category     TEXT,
     product_ids      TEXT[],
     starts_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
     ends_at          TIMESTAMPTZ NOT NULL,
     created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
     CHECK (ends_at > starts_at)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sale_campaigns_store_active ON sale_campaigns (store_id, starts_at, ends_at)`,
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

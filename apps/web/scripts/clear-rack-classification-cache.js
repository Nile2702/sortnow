// One-off: clears product_image_classification so every product is
// reclassified under the current lib/ai-rack-classify.ts prompt. Used once
// right after a prompt change - this cache is safe to clear any time since
// it's purely a performance cache, recomputed lazily on the next request to
// app/api/v1/products/rack.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`DELETE FROM product_image_classification`);
    console.log(`Cleared ${result.rowCount} cached classification(s).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});

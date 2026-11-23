// One-off migration: adds site_visits.location_label - the visitor's own
// self-reported area name (from lib/location.ts's location picker, e.g.
// "Bandra, Mumbai"), logged only when they've actually set one (see
// getStoredLocationPref). Never derived from IP address/geolocation - see
// VisitorTracking.tsx's own comment for why.
// Written against the live Neon database named by DATABASE_URL in
// .env.local, same pattern as the other migrate-*.js scripts here.
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

// See migrate-add-site-visits.js's own comment - this machine's local DNS
// resolver has been intermittently refusing this specific Neon hostname.
async function resolveViaPublicDns(hostname) {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  const addresses = await resolver.resolve4(hostname);
  return addresses[0];
}

const statements = [`ALTER TABLE site_visits ADD COLUMN IF NOT EXISTS location_label TEXT`];

async function main() {
  const url = new URL(connectionString);
  const ip = await resolveViaPublicDns(url.hostname);
  const client = new Client({
    host: ip,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false, servername: url.hostname },
  });
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

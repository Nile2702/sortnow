// One-off migration: adds the site_visits table, backing a new admin-facing
// "who's visiting the site" view (anonymous, site-wide - distinct from
// analytics_events, which is per-store and only covers storefront pages).
// visitor_id is a random id a browser generates for itself and keeps in
// localStorage (see lib/visitor-id.ts) - nothing here ties a row to a real
// identity (no name, phone, email, or raw IP is ever stored in this table).
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

// This machine's local/router DNS resolver is refusing to resolve this
// specific Neon pooler hostname right now (works fine via Google's public
// resolver directly - a local network hiccup, not a real DNS/connectivity
// problem). `dns.setServers()` has no effect here since `pg` connects via
// `net.connect`, which resolves through the OS's `getaddrinfo` rather than
// Node's own `dns.resolve*` - so the hostname is resolved explicitly below
// and the Client connects straight to that IP instead.
async function resolveViaPublicDns(hostname) {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  const addresses = await resolver.resolve4(hostname);
  return addresses[0];
}

const statements = [
  `CREATE TABLE IF NOT EXISTS site_visits (
    id              BIGSERIAL PRIMARY KEY,
    visitor_id      TEXT NOT NULL,
    path            TEXT NOT NULL,
    referrer        TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_site_visits_occurred_at ON site_visits (occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON site_visits (visitor_id)`,
];

async function main() {
  const url = new URL(connectionString);
  const ip = await resolveViaPublicDns(url.hostname);
  const client = new Client({
    host: ip,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    // Neon's pooler is a shared gateway that routes by TLS SNI (which
    // project/endpoint to connect to) - connecting by raw IP loses that
    // unless the original hostname is explicitly sent back as the SNI
    // servername.
    ssl: { rejectUnauthorized: false, servername: url.hostname },
  });
  await client.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log("OK:", sql.split("\n")[0]);
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

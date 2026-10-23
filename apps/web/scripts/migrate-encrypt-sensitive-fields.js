// One-off migration: encrypts any plaintext gstin/pan/upi_vpa/gemini_api_key
// already sitting in the live `stores` table, using the same AES-256-GCM
// scheme as lib/encryption.ts. Idempotent and safe to re-run - any value
// that already starts with the "enc:v1:" prefix is left untouched, so this
// can run before, during, or after the app code that writes new encrypted
// values is deployed, in any order, any number of times.
//
// Run with:  node scripts/migrate-encrypt-sensitive-fields.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");

function readEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match) throw new Error(`${name} not found in .env.local`);
  return match[1].trim();
}

const connectionString = readEnvVar("DATABASE_URL");
const encryptionKeyB64 = readEnvVar("DATA_ENCRYPTION_KEY");

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  const key = Buffer.from(encryptionKeyB64, "base64");
  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must decode (base64) to exactly 32 bytes for AES-256.");
  }
  return key;
}

function encryptField(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function isAlreadyEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

const FIELDS = [
  { column: "gstin", label: "GSTIN" },
  { column: "pan", label: "PAN" },
  { column: "upi_vpa", label: "UPI VPA" },
  { column: "gemini_api_key", label: "Gemini API key" },
];

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, gstin, pan, upi_vpa, gemini_api_key FROM stores`
  );

  const counts = Object.fromEntries(FIELDS.map((f) => [f.column, { encrypted: 0, skipped: 0 }]));

  for (const row of rows) {
    const sets = [];
    const params = [];
    for (const { column } of FIELDS) {
      const value = row[column];
      if (value == null || value === "") continue;
      if (isAlreadyEncrypted(value)) {
        counts[column].skipped++;
        continue;
      }
      params.push(encryptField(value));
      sets.push(`${column} = $${params.length}`);
      counts[column].encrypted++;
    }
    if (sets.length === 0) continue;
    params.push(row.id);
    await client.query(`UPDATE stores SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
  }

  for (const { column, label } of FIELDS) {
    const { encrypted, skipped } = counts[column];
    console.log(`${label}: encrypted ${encrypted}, already encrypted/skipped ${skipped}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

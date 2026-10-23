// Application-level encryption for the handful of columns that are
// genuinely confidential at rest - a seller's own GSTIN/PAN/UPI VPA (set
// once during onboarding, read back only on that seller's own account page
// and the admin review tools - see submitStoreForReview/
// updateStoreAccountDetails in lib/seed-data.ts) and their Gemini API key
// (see getGeminiApiKey/updateStoreGeminiKey, already deliberately excluded
// from the Store interface/rowToStore so it never reaches a shopper-facing
// response). Deliberately NOT applied to billing_settings.gstin/bills.gstin
// - those are printed on every customer invoice by law, so the plaintext is
// already disclosed by design; encrypting that copy would add real
// complexity (every bill-generation/invoice-render path) for no actual
// protection, since the same number is sitting in plain text on the
// invoice itself.
//
// AES-256-GCM: a random 12-byte IV per call (required - reusing an IV with
// the same key breaks GCM's confidentiality guarantee) plus the auth tag,
// both stored alongside the ciphertext so decrypt() doesn't need anything
// but the key. The "enc:v1:" prefix lets decrypt() tell a migrated value
// apart from a legacy plaintext one still sitting in the database from
// before this existed (see scripts/migrate-encrypt-sensitive-fields.js) -
// it passes anything without that prefix through unchanged rather than
// erroring, so a read never fails just because a given row hasn't been
// migrated yet.
import crypto from "crypto";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("DATA_ENCRYPTION_KEY is not set - see apps/web/.env.example. Required to write a GSTIN/PAN/UPI VPA/Gemini key.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must decode (base64) to exactly 32 bytes for AES-256.");
  }
  return key;
}

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

// Passes through anything that isn't actually one of this module's own
// encrypted values - a legacy plaintext GSTIN/PAN/UPI VPA/Gemini key from
// before the migration, or simply null/undefined, rather than throwing.
export function decryptField<T extends string | null | undefined>(value: T): T {
  if (value == null || !value.startsWith(PREFIX)) return value;
  const [ivB64, authTagB64, ciphertextB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) return value; // malformed - fail safe by returning as-is, not crashing a page load
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8") as T;
}

import { test } from "node:test";
import assert from "node:assert/strict";

// A fixed throwaway key just for this test run - never the real
// DATA_ENCRYPTION_KEY, which only ever lives in .env.local/Vercel.
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const { encryptField, decryptField } = await import("./encryption.ts");

test("round-trips a plaintext value through encrypt then decrypt", () => {
  const original = "27AAAAA0000A1Z5";
  const encrypted = encryptField(original);
  assert.notEqual(encrypted, original);
  assert.ok(encrypted.startsWith("enc:v1:"));
  assert.equal(decryptField(encrypted), original);
});

test("two encryptions of the same value produce different ciphertext (random IV)", () => {
  const a = encryptField("ABCDE1234F1Z5");
  const b = encryptField("ABCDE1234F1Z5");
  assert.notEqual(a, b);
});

test("passes a legacy plaintext value through unchanged (pre-migration rows)", () => {
  assert.equal(decryptField("27AAAAA0000A1Z5"), "27AAAAA0000A1Z5");
});

test("passes null/undefined through unchanged", () => {
  assert.equal(decryptField(null), null);
  assert.equal(decryptField(undefined), undefined);
});

test("throws a clear error when DATA_ENCRYPTION_KEY is missing", async () => {
  const saved = process.env.DATA_ENCRYPTION_KEY;
  delete process.env.DATA_ENCRYPTION_KEY;
  try {
    assert.throws(() => encryptField("x"), /DATA_ENCRYPTION_KEY is not set/);
  } finally {
    process.env.DATA_ENCRYPTION_KEY = saved;
  }
});

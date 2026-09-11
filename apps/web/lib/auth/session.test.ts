import { test } from "node:test";
import assert from "node:assert/strict";
import { createSellerSessionToken, verifySellerSessionToken } from "./session.ts";

test("round-trips a valid token", () => {
  const token = createSellerSessionToken({ storeId: "store-1", storeSlug: "urban-vogue" });
  const payload = verifySellerSessionToken(token);
  assert.ok(payload);
  assert.equal(payload?.storeId, "store-1");
  assert.equal(payload?.storeSlug, "urban-vogue");
});

test("rejects a missing token", () => {
  assert.equal(verifySellerSessionToken(null), null);
  assert.equal(verifySellerSessionToken(undefined), null);
  assert.equal(verifySellerSessionToken(""), null);
});

test("rejects a tampered payload", () => {
  const token = createSellerSessionToken({ storeId: "store-1", storeSlug: "urban-vogue" });
  const [body, sig] = token.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ storeId: "store-2", storeSlug: "other-store", iat: Date.now() })).toString("base64url");
  assert.equal(verifySellerSessionToken(`${forgedPayload}.${sig}`), null);
});

test("rejects a token with a bad signature", () => {
  const token = createSellerSessionToken({ storeId: "store-1", storeSlug: "urban-vogue" });
  const [body] = token.split(".");
  assert.equal(verifySellerSessionToken(`${body}.not-the-real-signature`), null);
});

test("rejects a malformed token", () => {
  assert.equal(verifySellerSessionToken("just-one-part"), null);
  assert.equal(verifySellerSessionToken("."), null);
});

test("rejects a token past its 7-day expiry", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const token = createSellerSessionToken({ storeId: "store-1", storeSlug: "urban-vogue" });
  assert.ok(verifySellerSessionToken(token));

  t.mock.timers.tick(8 * 24 * 60 * 60 * 1000); // fast-forward 8 days
  assert.equal(verifySellerSessionToken(token), null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.ts";

test("verifyPassword accepts the correct password", () => {
  const hash = hashPassword("sortitout123");
  assert.equal(verifyPassword("sortitout123", hash), true);
});

test("verifyPassword rejects a wrong password", () => {
  const hash = hashPassword("sortitout123");
  assert.equal(verifyPassword("wrong-password", hash), false);
});

test("hashPassword salts each hash differently", () => {
  const a = hashPassword("sortitout123");
  const b = hashPassword("sortitout123");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("sortitout123", a), true);
  assert.equal(verifyPassword("sortitout123", b), true);
});

test("verifyPassword rejects a malformed stored hash", () => {
  assert.equal(verifyPassword("sortitout123", "not-a-valid-hash"), false);
  assert.equal(verifyPassword("sortitout123", ""), false);
});

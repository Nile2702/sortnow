import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePassword } from "./validate-password.ts";

test("accepts a password with a letter, a number, and a special character at the minimum length", () => {
  const { errors } = validatePassword("abcd1$23");
  assert.deepEqual(errors, []);
});

test("requires a password", () => {
  const { errors } = validatePassword(undefined);
  assert.deepEqual(errors, ["Password is required."]);
});

test("rejects a password shorter than 8 characters", () => {
  const { errors } = validatePassword("ab1$23");
  assert.ok(errors.includes("Password must be at least 8 characters."));
});

test("rejects a password longer than 128 characters", () => {
  const { errors } = validatePassword("a1$".repeat(43));
  assert.ok(errors.includes("Password must be 128 characters or fewer."));
});

test("rejects a letters-only password", () => {
  const { errors } = validatePassword("abcdefg$");
  assert.ok(errors.includes("Password must include at least one number."));
});

test("rejects a numbers-only password", () => {
  const { errors } = validatePassword("1234567$");
  assert.ok(errors.includes("Password must include at least one letter."));
});

test("rejects a password with no special character", () => {
  const { errors } = validatePassword("abcd1234");
  assert.ok(errors.includes("Password must include at least one special character (e.g. $, !, #)."));
});

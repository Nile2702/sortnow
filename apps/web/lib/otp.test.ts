import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOtp, verifyOtp, normalizePhone } from "./otp.ts";

function freshPhone(): string {
  // Each test uses its own phone number so rate-limit/attempt state from
  // one test never bleeds into another (otp.ts keeps process-wide state).
  return String(6000000000 + Math.floor(Math.random() * 900000000));
}

test("normalizePhone strips non-digits and keeps the last 10", () => {
  assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
  assert.equal(normalizePhone("9876543210"), "9876543210");
});

test("rejects a phone number that isn't 10 digits", () => {
  const result = requestOtp("12345");
  assert.equal(result.ok, false);
});

test("requestOtp then verifyOtp with the correct code succeeds", () => {
  const phone = freshPhone();
  const result = requestOtp(phone);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(verifyOtp(phone, result.devOtp));
});

test("verifyOtp fails with the wrong code", () => {
  const phone = freshPhone();
  requestOtp(phone);
  assert.equal(verifyOtp(phone, "000000"), false);
});

test("verifyOtp fails when no OTP was ever requested", () => {
  const phone = freshPhone();
  assert.equal(verifyOtp(phone, "123456"), false);
});

test("an OTP is single-use - verifying twice fails the second time", () => {
  const phone = freshPhone();
  const result = requestOtp(phone);
  if (!result.ok) throw new Error("expected ok");
  assert.ok(verifyOtp(phone, result.devOtp));
  assert.equal(verifyOtp(phone, result.devOtp), false);
});

test("requesting a new OTP invalidates the previous one", () => {
  const phone = freshPhone();
  const first = requestOtp(phone);
  if (!first.ok) throw new Error("expected ok");
  const second = requestOtp(phone);
  if (!second.ok) throw new Error("expected ok");
  assert.equal(verifyOtp(phone, first.devOtp), false);
  assert.ok(verifyOtp(phone, second.devOtp));
});

test("rate-limits repeated OTP requests for the same phone", () => {
  const phone = freshPhone();
  let sawLimit = false;
  for (let i = 0; i < 10; i++) {
    const result = requestOtp(phone);
    if (!result.ok) {
      sawLimit = true;
      break;
    }
  }
  assert.ok(sawLimit, "expected rate limiting to kick in within 10 requests");
});

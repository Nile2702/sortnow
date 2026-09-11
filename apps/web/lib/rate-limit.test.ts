import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, clientIp } from "./rate-limit.ts";

test("allows requests under the limit", () => {
  const key = `test-${Math.random()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit(key, 5, 60_000).ok, true);
  }
});

test("blocks once the limit is exceeded", () => {
  const key = `test-${Math.random()}`;
  for (let i = 0; i < 3; i++) {
    assert.equal(rateLimit(key, 3, 60_000).ok, true);
  }
  const blocked = rateLimit(key, 3, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterMs > 0);
});

test("resets after the window elapses", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const key = `test-${Math.random()}`;
  assert.equal(rateLimit(key, 1, 1000).ok, true);
  assert.equal(rateLimit(key, 1, 1000).ok, false);

  t.mock.timers.tick(1001);
  assert.equal(rateLimit(key, 1, 1000).ok, true);
});

test("tracks separate keys independently", () => {
  const keyA = `test-a-${Math.random()}`;
  const keyB = `test-b-${Math.random()}`;
  assert.equal(rateLimit(keyA, 1, 60_000).ok, true);
  assert.equal(rateLimit(keyA, 1, 60_000).ok, false);
  assert.equal(rateLimit(keyB, 1, 60_000).ok, true);
});

test("clientIp reads the first entry of x-forwarded-for", () => {
  const req = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
  assert.equal(clientIp(req), "1.2.3.4");
});

test("clientIp falls back to x-real-ip, then unknown", () => {
  const withRealIp = new Request("http://localhost", { headers: { "x-real-ip": "9.9.9.9" } });
  assert.equal(clientIp(withRealIp), "9.9.9.9");

  const bare = new Request("http://localhost");
  assert.equal(clientIp(bare), "unknown");
});

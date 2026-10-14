import { test } from "node:test";
import assert from "node:assert/strict";
import { isPastReservationWindow, canCancelReservation } from "./reservation-expiry.ts";

const NOW = Date.parse("2026-01-15T12:00:00.000Z");

test("a pending reservation whose window hasn't passed is not past it", () => {
  assert.equal(isPastReservationWindow("pending", "2026-01-15T13:00:00.000Z", NOW), false);
});

test("a pending reservation whose window has passed is past it", () => {
  assert.equal(isPastReservationWindow("pending", "2026-01-15T11:00:00.000Z", NOW), true);
});

test("a pending reservation expiring at exactly now is past it (strict less-than on the boundary)", () => {
  assert.equal(isPastReservationWindow("pending", new Date(NOW).toISOString(), NOW), false);
  assert.equal(isPastReservationWindow("pending", new Date(NOW - 1).toISOString(), NOW), true);
});

test("a fulfilled reservation is never past its window, even with a stale reservedUntil", () => {
  assert.equal(isPastReservationWindow("fulfilled", "2020-01-01T00:00:00.000Z", NOW), false);
});

test("a cancelled reservation is never past its window", () => {
  assert.equal(isPastReservationWindow("cancelled", "2020-01-01T00:00:00.000Z", NOW), false);
});

test("an already-expired reservation is not re-flagged (status check short-circuits)", () => {
  assert.equal(isPastReservationWindow("expired", "2020-01-01T00:00:00.000Z", NOW), false);
});

test("accepts a Date instance for reservedUntil, not just a string", () => {
  assert.equal(isPastReservationWindow("pending", new Date(NOW - 60_000), NOW), true);
  assert.equal(isPastReservationWindow("pending", new Date(NOW + 60_000), NOW), false);
});

test("canCancelReservation: a pending reservation within its window can be cancelled", () => {
  assert.equal(canCancelReservation("pending", "2026-01-15T13:00:00.000Z", NOW), true);
});

test("canCancelReservation: a pending reservation past its window cannot be cancelled", () => {
  assert.equal(canCancelReservation("pending", "2026-01-15T11:00:00.000Z", NOW), false);
});

test("canCancelReservation: a fulfilled/cancelled/expired reservation cannot be cancelled", () => {
  assert.equal(canCancelReservation("fulfilled", "2026-01-15T13:00:00.000Z", NOW), false);
  assert.equal(canCancelReservation("cancelled", "2026-01-15T13:00:00.000Z", NOW), false);
  assert.equal(canCancelReservation("expired", "2020-01-01T00:00:00.000Z", NOW), false);
});

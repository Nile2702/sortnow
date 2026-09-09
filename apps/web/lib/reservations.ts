"use client";

// Tracks which reservation ids belong to this browser, since there's no auth
// to scope a server-side query by shopper. The reservations themselves live
// server-side (in-memory - lib/seed-data.ts `reservations`); this is just an index.

const STORAGE_KEY = "sio:reservation-ids";

export function getMyReservationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addMyReservationId(id: string) {
  const ids = getMyReservationIds();
  ids.unshift(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

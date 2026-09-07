"use client";

// Tracks which order ids belong to this browser, since there's no auth to
// scope a server-side query by shopper. The orders themselves live
// server-side (in-memory - lib/seed-data.ts `orders`); this is just an index.

const STORAGE_KEY = "sio:order-ids";

export function getMyOrderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addMyOrderId(id: string) {
  const ids = getMyOrderIds();
  ids.unshift(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

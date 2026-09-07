"use client";

// No merchant auth in this demo - the Seller Portal lets you pick which
// of the seed stores you're "managing" and remembers it in localStorage.
// Stands in for the merchant session in a real deployment (Merchant model
// in database/schema.sql, JWT-scoped to their store_id).

const STORAGE_KEY = "sio:seller-store-slug";
const DEFAULT_SLUG = "urban-vogue";

export function getSellerStoreSlug(): string {
  if (typeof window === "undefined") return DEFAULT_SLUG;
  return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SLUG;
}

export function setSellerStoreSlug(slug: string) {
  window.localStorage.setItem(STORAGE_KEY, slug);
  window.dispatchEvent(new Event("sio:seller-store-changed"));
}

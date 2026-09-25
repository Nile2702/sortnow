"use client";

// Sign-in itself is real (lib/otp.ts + the Shopper profile in
// lib/seed-data.ts) - this just remembers the signed-in shopper on this
// device so they aren't asked to re-verify on every visit. Signing in on a
// different device still works (the profile is looked up server-side by
// phone), it just won't carry this device's local state over.

const STORAGE_KEY = "sio:shopper";
const EVENT = "sio:shopper-session-changed";

export interface ShopperSession {
  name: string;
  phone: string;
  email?: string;
  preferredCategory?: "men" | "women" | "kids";
  pincode?: string;
}

export function getShopperSession(): ShopperSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setShopperSession(session: ShopperSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(EVENT));
}

export function clearShopperSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function onShopperSessionChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

"use client";

// No real auth service in this demo (see database/schema.sql · shoppers table
// for the intended model) - this mocks OTP login and remembers the shopper
// in localStorage, same pattern as seller-session.ts for the merchant side.

const STORAGE_KEY = "sio:shopper";
const EVENT = "sio:shopper-session-changed";

export interface ShopperSession {
  name: string;
  phone: string;
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

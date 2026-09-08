"use client";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
}

const STORAGE_KEY = "sio:shipping-address";

export function getSavedAddress(): ShippingAddress | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function saveAddress(address: ShippingAddress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
}

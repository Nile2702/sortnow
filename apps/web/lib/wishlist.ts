"use client";

// Guest wishlist, localStorage-backed for this demo — same pattern as
// lib/cart.ts. A real deployment persists this per shopper_id server-side.

export interface WishlistItem {
  productId: string;
  title: string;
  storeSlug: string;
  storeName: string;
  price: number;
  imageUrl: string;
}

const STORAGE_KEY = "sio:wishlist";

export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("sio:wishlist-updated"));
}

export function isWishlisted(productId: string): boolean {
  return getWishlist().some((i) => i.productId === productId);
}

export function toggleWishlist(item: WishlistItem): boolean {
  const items = getWishlist();
  const idx = items.findIndex((i) => i.productId === item.productId);
  if (idx >= 0) {
    items.splice(idx, 1);
    writeWishlist(items);
    return false;
  }
  items.unshift(item);
  writeWishlist(items);
  return true;
}

export function removeFromWishlist(productId: string) {
  writeWishlist(getWishlist().filter((i) => i.productId !== productId));
}

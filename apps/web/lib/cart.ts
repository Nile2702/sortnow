"use client";

// Guest cart, backed by localStorage (mirrors Redis cart:{session_id} in
// docs/02-system-architecture.md §3 for a logged-out shopper before login).

export interface CartItem {
  productId: string;
  title: string;
  storeSlug: string;
  storeName: string;
  size: string;
  price: number;
  imageUrl: string;
  quantity: number;
  // Lets the cart page decide whether this item's quantity is editable at
  // all (see allowsMultipleQuantity in lib/catalog-constants.ts) - optional
  // since carts saved before this field existed won't have it; those are
  // treated as not multiple-eligible (the conservative default) rather than
  // breaking on a missing field.
  subCategory?: string;
}

const STORAGE_KEY = "sio:cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("sio:cart-updated"));
}

export function addToCart(item: CartItem) {
  const items = getCart();
  const existing = items.find((i) => i.productId === item.productId && i.size === item.size);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }
  writeCart(items);
}

export function removeFromCart(productId: string, size: string) {
  writeCart(getCart().filter((i) => !(i.productId === productId && i.size === size)));
}

export function updateQuantity(productId: string, size: string, quantity: number) {
  const items = getCart();
  const item = items.find((i) => i.productId === productId && i.size === size);
  // A non-finite quantity (NaN from a pasted non-numeric value surviving a
  // type="number" input on some mobile keyboards, or Infinity) used to pass
  // straight through Math.max(1, NaN) as NaN, which JSON.stringify then
  // silently serializes as null - corrupting that cart line (cartTotal
  // would read its quantity as 0 forever after). Falls back to 1, the same
  // floor an invalid-but-finite value already gets.
  if (item) item.quantity = Number.isFinite(quantity) ? Math.max(1, quantity) : 1;
  writeCart(items);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.price, 0);
}

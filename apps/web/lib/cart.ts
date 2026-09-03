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
  if (item) item.quantity = Math.max(1, quantity);
  writeCart(items);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.price, 0);
}

// Server-side guard for seller-mutating API routes. Call at the top of any
// route handler that changes a specific store's data and bail out on `null`
// - every such route used to trust whatever :storeId was in the URL with no
// check that the caller actually owns it.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SELLER_SESSION_COOKIE, verifySellerSessionToken } from "./session";

export function getSellerSession() {
  const token = cookies().get(SELLER_SESSION_COOKIE)?.value;
  return verifySellerSessionToken(token);
}

/**
 * Returns a 401 NextResponse if there's no valid session, or if the session
 * isn't for `storeId` (accepts either the store's id or slug). Returns null
 * when the caller is authorized to proceed.
 */
export function requireSellerForStore(storeId: string, storeSlug?: string): NextResponse | null {
  const session = getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to the Seller Portal first." }, { status: 401 });
  }
  if (session.storeId !== storeId && (!storeSlug || session.storeSlug !== storeSlug)) {
    return NextResponse.json({ error: "forbidden", message: "You don't have access to this store." }, { status: 403 });
  }
  return null;
}

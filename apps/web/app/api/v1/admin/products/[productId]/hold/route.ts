import { NextRequest, NextResponse } from "next/server";
import { holdProduct } from "../../../../../../../lib/seed-data";
import { isValidAdminKey } from "../../../../../../../lib/admin-auth";
import { clientIp } from "../../../../../../../lib/rate-limit";

// Hides a single listing from every shopper-facing path (search, store
// page, product page, reservations - see the "on_hold" filters in
// lib/seed-data.ts) without touching the rest of that seller's catalog or
// their store's own status - the narrower alternative to
// .../admin/sellers/[storeId]/suspend. Gated by the same
// ?key=<ADMIN_SECRET> shared secret as every other /api/v1/admin/** route
// - see lib/admin-auth.ts; middleware.ts does NOT cover /api/* routes, so
// this has to check for itself.
export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!isValidAdminKey(req.nextUrl.searchParams.get("key"), clientIp(req))) {
    return NextResponse.json({ error: "forbidden", message: "Missing or invalid admin key." }, { status: 403 });
  }

  const updated = await holdProduct(params.productId);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Same plain-<form>-post convention as the seller review queue - no
  // client JS needed for a one-person pilot admin tool. Preserves whatever
  // search/status filter the admin had applied on app/admin/products so
  // holding a row doesn't reset their view.
  if (req.nextUrl.searchParams.get("redirect") === "1") {
    const back = new URL("/admin/products", req.url);
    back.searchParams.set("key", req.nextUrl.searchParams.get("key") ?? "");
    const q = req.nextUrl.searchParams.get("q");
    const status = req.nextUrl.searchParams.get("status");
    if (q) back.searchParams.set("q", q);
    if (status) back.searchParams.set("status", status);
    return NextResponse.redirect(back, 303);
  }
  return NextResponse.json(updated);
}

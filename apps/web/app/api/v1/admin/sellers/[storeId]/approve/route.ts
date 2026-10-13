import { NextRequest, NextResponse } from "next/server";
import { activateStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isValidAdminKey } from "../../../../../../../lib/admin-auth";

// The ONLY path that flips a "pending_review" store to "active" - called
// by the site owner from /admin/sellers after manually looking over the
// GSTIN/PAN/UPI details a seller submitted during onboarding (never from
// the seller's own onboarding flow - see
// app/api/v1/seller/stores/[storeId]/submit-for-review). Gated by the same
// ?key=<ADMIN_SECRET> shared secret as the admin page - see
// lib/admin-auth.ts; middleware.ts does NOT cover /api/* routes, so this
// has to check for itself.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!isValidAdminKey(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "forbidden", message: "Missing or invalid admin key." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await activateStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The admin page's Approve button is a plain HTML <form> post (simplest
  // thing that works for a one-person pilot tool, no client JS needed) -
  // redirect back to the queue instead of dumping JSON in the browser.
  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL(`/admin/sellers?key=${encodeURIComponent(req.nextUrl.searchParams.get("key") ?? "")}`, req.url), 303);
  }
  return NextResponse.json(updated);
}

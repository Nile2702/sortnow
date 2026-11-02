import { NextRequest, NextResponse } from "next/server";
import { activateStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isAuthorizedAdminRequest } from "../../../../../../../lib/admin-auth";

// The ONLY path that flips a "pending_review" store to "active" - called
// by the site owner from /admin/sellers after manually looking over the
// GSTIN/PAN/UPI details a seller submitted during onboarding (never from
// the seller's own onboarding flow - see
// app/api/v1/seller/stores/[storeId]/submit-for-review). Gated the same
// way as the admin page itself - see lib/admin-auth.ts; middleware.ts does
// NOT cover /api/* routes, so this has to check for itself.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json({ error: "forbidden", message: "Not signed in as admin." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await activateStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The admin page's Approve button is a plain HTML <form> post (simplest
  // thing that works for a one-person pilot tool, no client JS needed) -
  // redirect back to the queue instead of dumping JSON in the browser. No
  // key to re-thread anymore - the session cookie travels automatically.
  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL("/admin/sellers", req.url), 303);
  }
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { suspendStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isValidAdminKey } from "../../../../../../../lib/admin-auth";
import { clientIp } from "../../../../../../../lib/rate-limit";

// Puts an already-active store on hold - e.g. a shopper complaint or a
// policy violation found after approval. Flips status to "suspended" (the
// enum value already existed alongside draft/active/closed, just unused
// until now) - see the "active"-only filters throughout lib/seed-data.ts
// for why a suspended store's catalog disappears from shopper-facing
// search/browse/reservation the moment this runs. Gated by the same
// ?key=<ADMIN_SECRET> shared secret as approve/reject - see
// lib/admin-auth.ts; middleware.ts does NOT cover /api/* routes, so this
// has to check for itself.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!isValidAdminKey(req.nextUrl.searchParams.get("key"), clientIp(req))) {
    return NextResponse.json({ error: "forbidden", message: "Missing or invalid admin key." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await suspendStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Same plain-<form>-post convention as approve/reject - no client JS
  // needed for a one-person pilot admin tool.
  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL(`/admin/sellers/active?key=${encodeURIComponent(req.nextUrl.searchParams.get("key") ?? "")}`, req.url), 303);
  }
  return NextResponse.json(updated);
}

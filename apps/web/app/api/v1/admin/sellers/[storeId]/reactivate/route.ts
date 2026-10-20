import { NextRequest, NextResponse } from "next/server";
import { reactivateClosedStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isValidAdminKey } from "../../../../../../../lib/admin-auth";
import { clientIp } from "../../../../../../../lib/rate-limit";

// Reopens a store the seller closed themselves (closeStore) - the
// counterpart to reinstate, for "closed" instead of "suspended". Gated the
// same way as suspend/reinstate/approve/reject - see lib/admin-auth.ts.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!isValidAdminKey(req.nextUrl.searchParams.get("key"), clientIp(req))) {
    return NextResponse.json({ error: "forbidden", message: "Missing or invalid admin key." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await reactivateClosedStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL(`/admin/sellers/active?key=${encodeURIComponent(req.nextUrl.searchParams.get("key") ?? "")}`, req.url), 303);
  }
  return NextResponse.json(updated);
}

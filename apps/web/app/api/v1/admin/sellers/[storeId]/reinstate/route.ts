import { NextRequest, NextResponse } from "next/server";
import { reinstateStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isValidAdminKey } from "../../../../../../../lib/admin-auth";

// Reverses suspendStore - flips a "suspended" store back to "active",
// restoring it to every shopper-facing search/browse/reservation path
// (see the "active"-only filters in lib/seed-data.ts). Gated the same way
// as suspend/approve/reject - see lib/admin-auth.ts.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!isValidAdminKey(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "forbidden", message: "Missing or invalid admin key." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await reinstateStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL(`/admin/sellers/active?key=${encodeURIComponent(req.nextUrl.searchParams.get("key") ?? "")}`, req.url), 303);
  }
  return NextResponse.json(updated);
}

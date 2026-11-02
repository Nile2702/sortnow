import { NextRequest, NextResponse } from "next/server";
import { reactivateClosedStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isAuthorizedAdminRequest } from "../../../../../../../lib/admin-auth";

// Reopens a store the seller closed themselves (closeStore) - the
// counterpart to reinstate, for "closed" instead of "suspended". Gated the
// same way as suspend/reinstate/approve/reject - see lib/admin-auth.ts.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json({ error: "forbidden", message: "Not signed in as admin." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await reactivateClosedStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL("/admin/sellers/active", req.url), 303);
  }
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { rejectStore, getAllStores } from "../../../../../../../lib/seed-data";
import { isAuthorizedAdminRequest } from "../../../../../../../lib/admin-auth";

// Sends a "pending_review" store back to "draft" - the site owner declined
// to activate it. The seller can fix their details and resubmit via
// onboarding. Gated the same way as approve/route.ts - see lib/admin-auth.ts.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  if (!(await isAuthorizedAdminRequest(req))) {
    return NextResponse.json({ error: "forbidden", message: "Not signed in as admin." }, { status: 403 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await rejectStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("redirect") === "1") {
    return NextResponse.redirect(new URL("/admin/sellers", req.url), 303);
  }
  return NextResponse.json(updated);
}

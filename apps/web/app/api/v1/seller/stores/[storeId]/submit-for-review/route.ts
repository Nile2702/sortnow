import { NextRequest, NextResponse } from "next/server";
import { getAllStores, submitStoreForReview } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

// Called once by the onboarding flow's final step - takes a freshly signed
// up store from "draft" (invisible to shoppers) to "pending_review". No
// real KYC provider is ever called here; the GSTIN/PAN/UPI values are just
// recorded for the site owner to manually look over and approve via
// /admin/sellers. This intentionally does NOT activate the store itself -
// see app/api/v1/admin/sellers/[storeId]/approve for the only path that
// flips a store to "active".
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { gstin?: string; pan?: string; upiVpa?: string } | null;

  const updated = await submitStoreForReview(store.id, {
    gstin: body?.gstin,
    pan: body?.pan,
    upiVpa: body?.upiVpa,
  });
  if (!updated) {
    // Either the store doesn't exist any more, or it isn't "draft" (already
    // submitted/approved) - submitStoreForReview() only moves draft stores.
    return NextResponse.json({ error: "invalid_state", message: "This store has already been submitted for review." }, { status: 409 });
  }
  return NextResponse.json(updated);
}

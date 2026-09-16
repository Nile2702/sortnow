import { NextRequest, NextResponse } from "next/server";
import { stores, buyPhotoCredits } from "../../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../../lib/auth/require-seller";

// No real PSP call - same demo stand-in as billing/subscribe. A real
// deployment redirects to Razorpay/Cashfree checkout here and only credits
// the balance after a verified webhook, not on the client's say-so.
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const { packageId } = await req.json().catch(() => ({ packageId: null }));
  const newBalance = buyPhotoCredits(store.id, packageId);
  if (newBalance === null) {
    return NextResponse.json({ error: "invalid_package" }, { status: 400 });
  }

  return NextResponse.json({ balance: newBalance });
}

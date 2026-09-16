import { NextRequest, NextResponse } from "next/server";
import { changePlan, stores } from "../../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../../lib/auth/require-seller";

// No real PSP call - flips the in-memory plan. A real deployment redirects
// to Razorpay/Cashfree checkout here (docs/04-monetization-and-billing.md).
export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const { planCode } = await req.json();
  const subscription = changePlan(store.id, planCode);
  if (!subscription) {
    return NextResponse.json({ error: "invalid_plan", message: "planCode must be one of the published plans" }, { status: 400 });
  }
  return NextResponse.json(subscription);
}

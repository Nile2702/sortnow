import { NextRequest, NextResponse } from "next/server";
import {
  getSubscription,
  getInvoicesForStore,
  getStoreProducts,
  PLANS,
  getAllStores,
  isInFreeTrial,
  freeTrialEndsAt,
  FREE_TRIAL_MONTHS,
  estimateMonthlyCost,
} from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const active = isInFreeTrial(store.activatedAt);
  const subscription = await getSubscription(store.id, store.activatedAt);
  const skuCount = (await getStoreProducts(store.id)).length;
  // No invoice should exist for a window nothing was actually billed for -
  // showing the usual demo invoice history here would directly contradict
  // the free-trial messaging on the same page.
  const invoices = active ? [] : await getInvoicesForStore(store.id);
  const currentPlan = PLANS.find((p) => p.code === subscription.planCode)!;

  return NextResponse.json({
    subscription,
    invoices,
    skuCount,
    plans: PLANS,
    freeTrial: { active, months: FREE_TRIAL_MONTHS, endsAt: freeTrialEndsAt(store.activatedAt) },
    // The trial waives the flat subscription fee, not metered overage - a
    // Max store that lists past 2,000 SKUs is still billed for the excess
    // even while "free".
    estimatedMonthlyCost: estimateMonthlyCost(currentPlan, skuCount, active),
  });
}

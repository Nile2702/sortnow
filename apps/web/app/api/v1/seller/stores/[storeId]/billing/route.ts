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
} from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const subscription = await getSubscription(store.id);
  const skuCount = (await getStoreProducts(store.id)).length;
  const active = isInFreeTrial(store.activatedAt);
  // No invoice should exist for a window nothing was actually billed for -
  // showing the usual demo invoice history here would directly contradict
  // the free-trial messaging on the same page.
  const invoices = active ? [] : await getInvoicesForStore(store.id);

  return NextResponse.json({
    subscription,
    invoices,
    skuCount,
    plans: PLANS,
    freeTrial: { active, months: FREE_TRIAL_MONTHS, endsAt: freeTrialEndsAt(store.activatedAt) },
  });
}

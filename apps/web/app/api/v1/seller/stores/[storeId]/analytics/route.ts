import { NextRequest, NextResponse } from "next/server";
import { getStoreAnalytics, stores } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;
  return NextResponse.json(getStoreAnalytics(store.id));
}

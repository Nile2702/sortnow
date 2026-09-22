import { NextRequest, NextResponse } from "next/server";
import { activateStore, stores } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

// Called once by the onboarding flow's final step - takes a freshly signed
// up store from "draft" (invisible to shoppers) to "active".
export async function POST(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const updated = activateStore(store.id);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

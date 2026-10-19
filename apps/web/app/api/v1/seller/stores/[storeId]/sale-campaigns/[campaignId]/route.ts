import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAllStores, cancelSaleCampaign } from "../../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../../lib/auth/require-seller";

export async function DELETE(_req: NextRequest, { params }: { params: { storeId: string; campaignId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const ok = await cancelSaleCampaign(params.campaignId, store.id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}

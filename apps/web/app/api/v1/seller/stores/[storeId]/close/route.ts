import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAllStores, closeStore } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

// Self-service "quit SORT NOW" - see closeStore() in lib/seed-data.ts for
// why this only works from "active" and why reopening isn't symmetric
// (admin-only, via /admin/sellers/active).
export async function POST(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const updated = await closeStore(store.id);
  if (!updated) {
    return NextResponse.json({ error: "invalid_state", message: "Only an active store can be closed." }, { status: 409 });
  }

  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/shops");
  revalidatePath("/");

  return NextResponse.json(updated);
}

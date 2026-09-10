import { NextRequest, NextResponse } from "next/server";
import { stores, getStoreReservations, effectiveReservationStatus } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json([], { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const list = getStoreReservations(store.id)
    .map((r) => ({ ...r, status: effectiveReservationStatus(r) }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(list);
}

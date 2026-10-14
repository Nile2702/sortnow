import { NextRequest, NextResponse } from "next/server";
import { getReservation, updateReservationStatus, getAllStores } from "../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../lib/auth/require-seller";

export async function PATCH(req: NextRequest, { params }: { params: { reservationId: string } }) {
  const existing = await getReservation(params.reservationId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const stores = await getAllStores();
  const existingStore = stores.find((s) => s.id === existing.storeId);
  const denied = requireSellerForStore(existing.storeId, existingStore?.slug);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { status: "fulfilled" | "cancelled" } | null;
  const status = body?.status;
  if (status !== "fulfilled" && status !== "cancelled") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  if (existing.status !== "pending") {
    // updateReservationStatus only transitions a still-pending reservation
    // (see its own "AND status = 'pending'" guard) - give a clearer error
    // than a blanket 404 for one that exists but already moved on.
    return NextResponse.json(
      { error: "not_cancellable", message: `This reservation is already ${existing.status} and can't be updated.` },
      { status: 409 }
    );
  }
  const updated = await updateReservationStatus(params.reservationId, status);
  if (!updated) {
    // Lost a race against a concurrent transition between the check above
    // and this write.
    return NextResponse.json(
      { error: "not_cancellable", message: "This reservation is no longer pending and can't be updated." },
      { status: 409 }
    );
  }
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { getReservation, updateReservationStatus, stores } from "../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../lib/auth/require-seller";

export async function PATCH(req: NextRequest, { params }: { params: { reservationId: string } }) {
  const existing = getReservation(params.reservationId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const existingStore = stores.find((s) => s.id === existing.storeId);
  const denied = requireSellerForStore(existing.storeId, existingStore?.slug);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { status: "fulfilled" | "cancelled" } | null;
  const status = body?.status;
  if (status !== "fulfilled" && status !== "cancelled") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const updated = updateReservationStatus(params.reservationId, status);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

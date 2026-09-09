import { NextRequest, NextResponse } from "next/server";
import { updateReservationStatus } from "../../../../../../lib/seed-data";

export async function PATCH(req: NextRequest, { params }: { params: { reservationId: string } }) {
  const { status } = (await req.json()) as { status: "fulfilled" | "cancelled" };
  if (status !== "fulfilled" && status !== "cancelled") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const updated = updateReservationStatus(params.reservationId, status);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { getReservation, effectiveReservationStatus } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { reservationId: string } }) {
  const reservation = getReservation(params.reservationId);
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ...reservation, status: effectiveReservationStatus(reservation) });
}

import { NextRequest, NextResponse } from "next/server";
import { getReservation, updateReservationStatus } from "../../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";

// Shopper-facing cancellation - app/legal/refund-policy/page.tsx promises
// "You can cancel a reservation any time before its pickup window ends from
// the 'My Reservations' page, at no cost." There's no real shopper
// auth/session in this app (phone-based, no signed session) - same trust
// model as the GET-by-id route right next to this one: the reservation id
// itself acts as a bearer token, since a shopper's own reservation ids are
// only ever kept client-side (lib/reservations.ts). Deliberately not
// inventing new auth for this one route.
export async function POST(req: NextRequest, { params }: { params: { reservationId: string } }) {
  const limit = rateLimit(`reservations-cancel:${clientIp(req)}`, 20, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // getReservation applies the write-on-read expiry flip, so a reservation
  // whose pickup window already lapsed reads as "expired" here even if
  // nothing had looked at it since - it can't be cancelled either.
  const reservation = await getReservation(params.reservationId);
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (reservation.status !== "pending") {
    return NextResponse.json(
      { error: "not_cancellable", message: `This reservation is already ${reservation.status} and can't be cancelled.` },
      { status: 409 }
    );
  }

  // updateReservationStatus only transitions a still-pending row (guards
  // with "AND status = 'pending'"), so a concurrent fulfil/cancel/expiry
  // landing between the check above and this write loses here rather than
  // both succeeding.
  const updated = await updateReservationStatus(params.reservationId, "cancelled");
  if (!updated) {
    return NextResponse.json(
      { error: "not_cancellable", message: "This reservation is no longer pending and can't be cancelled." },
      { status: 409 }
    );
  }
  return NextResponse.json(updated);
}

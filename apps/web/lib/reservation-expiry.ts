// Pure, DB-free reservation-expiry logic, factored out of lib/seed-data.ts
// so it can be unit tested directly (lib/seed-data.ts pulls in lib/db.ts,
// whose pooled Postgres client throws at import time if DATABASE_URL isn't
// set - exactly the environment a plain `npm test` run doesn't have).
//
// This platform is "reserve online, walk into the store to pick up" with no
// online payment - a reservation just holds stock for a fixed window
// (Reservation.reservedUntil, chosen by the shopper at reserve time, see
// app/reserve/page.tsx's DURATIONS). Nothing here assumes a scheduled job
// ever runs: Vercel's Hobby plan only allows a cron once per day, nowhere
// near frequent enough for a hold window measured in tens of minutes to a
// few hours. Instead, expiry is evaluated lazily, right when a reservation
// is actually read or when stock availability is checked - see
// lib/seed-data.ts's getReservation/getStoreReservations (which flip a
// stale "pending" row to "expired" in the DB the first time anything reads
// it past its window) and getProductReservedQuantity (which must apply this
// same check so an expired-but-not-yet-flipped reservation never holds
// stock hostage).
export function isPastReservationWindow(status: string, reservedUntil: string | Date, now: number = Date.now()): boolean {
  return status === "pending" && new Date(reservedUntil).getTime() < now;
}

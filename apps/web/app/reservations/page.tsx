"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyReservationIds } from "../../lib/reservations";

interface Reservation {
  id: string;
  storeName: string;
  items: { title: string; quantity: number }[];
  total: number;
  status: "pending" | "fulfilled" | "cancelled" | "expired";
  reservedUntil: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#fef9c3", fg: "#854d0e", label: "Pending Pickup" },
  fulfilled: { bg: "#dcfce7", fg: "#166534", label: "Picked Up" },
  cancelled: { bg: "#f1f5f9", fg: "#64748b", label: "Cancelled" },
  expired: { bg: "#fee2e2", fg: "#991b1b", label: "Expired" },
};

// Same 15-minute urgency cutoff as the reservation detail page.
const URGENT_THRESHOLD_MS = 15 * 60 * 1000;

function formatMinutesLeft(reservedUntil: string) {
  const ms = new Date(reservedUntil).getTime() - Date.now();
  if (ms <= 0) return "Time's up";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  // Ticks every second purely to re-render the per-row countdown below -
  // same pattern as the reservation detail page's own live countdown, just
  // against the reservedUntil timestamps already in `reservations` rather
  // than refetching.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ids = getMyReservationIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) =>
        fetch(`/api/v1/reservations/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setReservations(results.filter(Boolean) as Reservation[]);
      setLoading(false);
    });
  }, []);

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, fontWeight: 700 }}>My Reservations</h1>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : reservations.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No reservations yet.{" "}
          <Link href="/" style={{ color: "#1e3a8a" }}>
            Start sorting
          </Link>
          .
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reservations.map((r) => {
            const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
            const msLeft = new Date(r.reservedUntil).getTime() - Date.now();
            const isUrgent = r.status === "pending" && msLeft > 0 && msLeft <= URGENT_THRESHOLD_MS;
            return (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="sio-card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #f1f5f9",
                  padding: 16,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{r.storeName}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isUrgent ? "#fee2e2" : s.bg,
                        color: isUrgent ? "#991b1b" : s.fg,
                      }}
                    >
                      {r.status === "pending" ? formatMinutesLeft(r.reservedUntil) : s.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                    {r.items.length} item{r.items.length > 1 ? "s" : ""} · {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>₹{r.total}</div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyReservationIds } from "../../lib/reservations";
import { canCancelReservation } from "../../lib/reservation-expiry";
import { LoadingSpinner } from "../../components/LoadingSpinner";

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
  pending: { bg: "var(--sio-pending-bg)", fg: "var(--sio-pending)", label: "Pending Pickup" },
  fulfilled: { bg: "var(--sio-success-bg)", fg: "var(--sio-success)", label: "Picked Up" },
  cancelled: { bg: "var(--sio-cream)", fg: "var(--sio-muted)", label: "Cancelled" },
  expired: { bg: "var(--sio-error-bg)", fg: "var(--sio-error)", label: "Expired" },
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
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <LoadingSpinner />
        </div>
      ) : reservations.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>
          No reservations yet.{" "}
          <Link href="/" style={{ color: "var(--sio-ink)" }}>
            Start sorting
          </Link>
          .
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reservations.map((r) => (
            <ReservationRow
              key={r.id}
              reservation={r}
              onUpdate={(updated) => setReservations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function ReservationRow({ reservation: r, onUpdate }: { reservation: Reservation; onUpdate: (r: Reservation) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
  const msLeft = new Date(r.reservedUntil).getTime() - Date.now();
  const isUrgent = r.status === "pending" && msLeft > 0 && msLeft <= URGENT_THRESHOLD_MS;
  const cancellable = canCancelReservation(r.status, r.reservedUntil);

  async function handleCancel() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reservations/${r.id}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || "Couldn't cancel this reservation.");
        setConfirming(false);
        return;
      }
      onUpdate(data);
      setConfirming(false);
    } catch {
      setError("Couldn't cancel this reservation. Check your connection.");
      setConfirming(false);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--sio-cream)", padding: 16 }}>
      <Link
        href={`/reservations/${r.id}`}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
                background: isUrgent ? "var(--sio-error-bg)" : s.bg,
                color: isUrgent ? "var(--sio-error)" : s.fg,
              }}
            >
              {r.status === "pending" ? formatMinutesLeft(r.reservedUntil) : s.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--sio-muted)", marginTop: 2 }}>
            {r.items.length} item{r.items.length > 1 ? "s" : ""} · {new Date(r.createdAt).toLocaleDateString("en-IN")}
          </div>
        </div>
        <div style={{ fontWeight: 700 }}>₹{r.total.toLocaleString("en-IN")}</div>
      </Link>

      {cancellable && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--sio-cream)" }}>
          {error && <p style={{ color: "var(--sio-error)", fontSize: 12.5, margin: "0 0 8px" }}>{error}</p>}
          {confirming ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: "var(--sio-ink-soft)", fontWeight: 600 }}>Cancel this reservation?</span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "var(--sio-error)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: cancelling ? "default" : "pointer",
                  opacity: cancelling ? 0.7 : 1,
                }}
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={cancelling}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--sio-line)",
                  background: "#fff",
                  color: "var(--sio-ink)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Never mind
              </button>
            </div>
          ) : (
            <button
              onClick={handleCancel}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--sio-error-border)",
                background: "#fff",
                color: "var(--sio-error)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel reservation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

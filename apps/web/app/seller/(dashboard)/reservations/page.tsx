"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { showToast } from "../../../../lib/toast";
import { LoadingScreen } from "../../../../components/LoadingSpinner";

interface ReservationItem {
  productId: string;
  title: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Reservation {
  id: string;
  items: ReservationItem[];
  total: number;
  shopperName: string;
  shopperPhone: string;
  status: "pending" | "fulfilled" | "cancelled" | "expired";
  reservedUntil: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "var(--sio-pending-bg)", fg: "var(--sio-pending)", label: "Pending" },
  fulfilled: { bg: "var(--sio-success-bg)", fg: "var(--sio-success)", label: "Picked Up" },
  cancelled: { bg: "var(--sio-cream)", fg: "var(--sio-muted)", label: "Cancelled" },
  expired: { bg: "var(--sio-error-bg)", fg: "var(--sio-error)", label: "Expired" },
};

function minutesLeft(reservedUntil: string) {
  return Math.max(0, Math.round((new Date(reservedUntil).getTime() - Date.now()) / 60000));
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// A plain honest breakdown over the last 30 days, no new tracking needed -
// every reservation already carries the status this adds up (and "expired"
// only became a real, persisted status once write-on-read expiry flipping
// landed - see lib/seed-data.ts's flipIfExpired). "Uncollected" means
// expired specifically: the shopper never showed up AND never cancelled,
// as opposed to a cancellation, which is a deliberate shopper action, not a
// no-show. The percentage is of resolved (fulfilled + expired) reservations
// only - a reservation still pending hasn't had a chance to go either way
// yet, and counting it would understate the rate while it's outstanding.
function computeNoShowStats(reservations: Reservation[]) {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const recent = reservations.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  const fulfilled = recent.filter((r) => r.status === "fulfilled").length;
  const expired = recent.filter((r) => r.status === "expired").length;
  const cancelled = recent.filter((r) => r.status === "cancelled").length;
  const resolved = fulfilled + expired;
  const uncollectedPercent = resolved > 0 ? Math.round((expired / resolved) * 100) : 0;
  return { fulfilled, expired, cancelled, resolved, uncollectedPercent };
}

export default function SellerReservationsPage() {
  const { store, loading } = useSellerStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [, forceTick] = useState(0);

  function load() {
    if (!store) return;
    setLoadError(false);
    fetch(`/api/v1/seller/stores/${store.id}/reservations`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setReservations)
      // A failed/expired-session response used to be stored as-is (an
      // {error, message} object, not an array) and crash every render below
      // that assumes `reservations` is a list (computeNoShowStats' filters,
      // `pending`/`past`). Now it just shows a retryable error instead.
      .catch(() => setLoadError(true));
  }

  useEffect(load, [store]);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function updateStatus(id: string, status: "fulfilled" | "cancelled") {
    setUpdating(id);
    try {
      const res = await fetch(`/api/v1/seller/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        showToast(result?.message ?? "Couldn't update this reservation. Try again.", "error");
        return;
      }
      load();
      showToast(status === "fulfilled" ? "Marked as picked up" : "Reservation cancelled", status === "fulfilled" ? "success" : "default");
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setUpdating(null);
    }
  }

  if (loading || !store) {
    return <LoadingScreen maxWidth={1440} />;
  }

  if (loadError) {
    return (
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load your reservations.</p>
        <button
          onClick={load}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </main>
    );
  }

  const pending = reservations.filter((r) => r.status === "pending");
  const past = reservations.filter((r) => r.status !== "pending");

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Reservations</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 20 }}>
        {store.name} · shoppers who reserved items to pick up in person. Mark a reservation done once they've collected it, or cancel if they no-show.
      </p>

      {(() => {
        const stats = computeNoShowStats(reservations);
        return (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--sio-cream)", padding: 20, marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sio-muted)", marginBottom: 4 }}>Last 30 Days</div>
            {stats.resolved === 0 ? (
              <p style={{ color: "var(--sio-muted)", fontSize: 13, margin: 0 }}>
                No completed or expired reservations in the last 30 days yet - the no-show rate will show up here once some have.
              </p>
            ) : (
              <p style={{ fontSize: 15, marginBottom: 14 }}>
                <strong style={{ color: stats.uncollectedPercent > 0 ? "var(--sio-error)" : "var(--sio-success)" }}>{stats.uncollectedPercent}%</strong> of reservations
                went uncollected (never picked up, hold expired).
              </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sio-success)" }}>{stats.fulfilled}</div>
                <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>Picked Up</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sio-error)" }}>{stats.expired}</div>
                <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>Uncollected (Expired)</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sio-muted)" }}>{stats.cancelled}</div>
                <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>Cancelled</div>
              </div>
            </div>
          </div>
        );
      })()}

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Awaiting Pickup ({pending.length})</h2>
      {pending.length === 0 ? (
        <p style={{ color: "var(--sio-muted)", fontSize: 14, marginBottom: 28 }}>No pending reservations right now.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {pending.map((r) => (
            <div key={r.id} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--sio-pending-border)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.shopperName}</div>
                  <div style={{ fontSize: 13, color: "var(--sio-muted)" }}>{r.shopperPhone}</div>
                </div>
                <span
                  className="sio-breathe"
                  style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "var(--sio-pending-bg)", color: "var(--sio-pending)" }}
                >
                  {minutesLeft(r.reservedUntil)} min left
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {r.items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>
                      {item.title} · Size {item.size} · Qty {item.quantity}
                    </span>
                    <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>Total: ₹{r.total.toLocaleString("en-IN")}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => updateStatus(r.id, "cancelled")}
                    disabled={updating === r.id}
                    style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid var(--sio-line)", background: "#fff", fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "fulfilled")}
                    disabled={updating === r.id}
                    style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "var(--sio-success)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Mark Picked Up
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>History</h2>
      {past.length === 0 ? (
        <p style={{ color: "var(--sio-muted)", fontSize: 14 }}>No past reservations yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {past.map((r) => {
            const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--sio-cream)" }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{r.shopperName}</strong> · {r.items.length} item{r.items.length > 1 ? "s" : ""} · ₹{r.total.toLocaleString("en-IN")}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.fg }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

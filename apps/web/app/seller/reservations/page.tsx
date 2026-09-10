"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../lib/use-seller-store";
import { showToast } from "../../../lib/toast";

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
  pending: { bg: "#fef9c3", fg: "#854d0e", label: "Pending" },
  fulfilled: { bg: "#dcfce7", fg: "#166534", label: "Picked Up" },
  cancelled: { bg: "#f1f5f9", fg: "#64748b", label: "Cancelled" },
  expired: { bg: "#fee2e2", fg: "#991b1b", label: "Expired" },
};

function minutesLeft(reservedUntil: string) {
  return Math.max(0, Math.round((new Date(reservedUntil).getTime() - Date.now()) / 60000));
}

export default function SellerReservationsPage() {
  const { store, loading } = useSellerStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  function load() {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/reservations`)
      .then((r) => r.json())
      .then(setReservations);
  }

  useEffect(load, [store]);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function updateStatus(id: string, status: "fulfilled" | "cancelled") {
    setUpdating(id);
    await fetch(`/api/v1/seller/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
    setUpdating(null);
    showToast(status === "fulfilled" ? "Marked as picked up" : "Reservation cancelled", status === "fulfilled" ? "success" : "default");
  }

  if (loading || !store) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const pending = reservations.filter((r) => r.status === "pending");
  const past = reservations.filter((r) => r.status !== "pending");

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Reservations</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        {store.name} · shoppers who reserved items to pick up in person. Mark a reservation done once they've collected it, or cancel if they no-show.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Awaiting Pickup ({pending.length})</h2>
      {pending.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 28 }}>No pending reservations right now.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {pending.map((r) => (
            <div key={r.id} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #fde68a", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.shopperName}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{r.shopperPhone}</div>
                </div>
                <span
                  className="sio-breathe"
                  style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#fef9c3", color: "#854d0e" }}
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
                    <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>Total: ₹{r.total}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => updateStatus(r.id, "cancelled")}
                    disabled={updating === r.id}
                    style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "fulfilled")}
                    disabled={updating === r.id}
                    style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
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
        <p style={{ color: "#94a3b8", fontSize: 14 }}>No past reservations yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {past.map((r) => {
            const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
            return (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{r.shopperName}</strong> · {r.items.length} item{r.items.length > 1 ? "s" : ""} · ₹{r.total}
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

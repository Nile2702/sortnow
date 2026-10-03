"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";

interface Notification {
  id: string;
  recipient: "seller" | "shopper";
  phone: string;
  trigger: string;
  message: string;
  createdAt: string;
}

const TRIGGER_LABEL: Record<string, string> = {
  reservation_created: "New reservation",
  reservation_fulfilled: "Pickup completed",
  reservation_cancelled: "Reservation cancelled",
};

export default function SellerNotificationsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/notifications`)
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [store]);

  if (storeLoading || !store) {
    return <main style={{ maxWidth: 900, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Notifications</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Every SMS this platform has sent about {store.name} — to you when a reservation comes in, and to shoppers when their pickup is
        confirmed or cancelled.{" "}
        {!store.phone && (
          <>
            You don't have a phone number on file yet, so you're not receiving these yourself — add one via{" "}
            <a href="/seller/signup" style={{ color: "#0f172a", fontWeight: 600 }}>
              account settings
            </a>{" "}
            (or ask support).
          </>
        )}
      </p>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : notifications.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Nothing sent yet — this fills up as reservations come in and get picked up.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map((n) => (
            <div key={n.id} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: n.recipient === "seller" ? "#e0e7ff" : "#dcfce7",
                    color: n.recipient === "seller" ? "#3730a3" : "#166534",
                  }}
                >
                  To {n.recipient === "seller" ? "you" : "shopper"} · {TRIGGER_LABEL[n.trigger] ?? n.trigger}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(n.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#334155", margin: 0 }}>{n.message}</p>
              <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 6 }}>Sent to +91 {n.phone}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

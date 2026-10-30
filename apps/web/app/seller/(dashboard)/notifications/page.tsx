"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { LoadingScreen, LoadingSpinner } from "../../../../components/LoadingSpinner";

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
  back_in_stock: "Back in stock",
  referral_joined: "Referral joined",
  store_approved: "Store approved",
  store_rejected: "Store submission rejected",
  store_suspended: "Store put on hold",
  store_reinstated: "Store reinstated",
  product_held: "Listing taken down",
  product_unheld: "Listing restored",
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
    return <LoadingScreen maxWidth={900} />;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Notifications</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24 }}>
        Every SMS this platform has sent about {store.name} — to you when a reservation comes in or your store/listing status changes, and
        to shoppers when their pickup is confirmed, cancelled, or a waitlisted item comes back in stock.{" "}
        {!store.phone && (
          <>There's no phone number on file for this store yet, so you're not receiving these yourself — contact support to add one.</>
        )}
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <LoadingSpinner />
        </div>
      ) : notifications.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>Nothing sent yet — this fills up as reservations come in and get picked up.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map((n) => (
            <div key={n.id} className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: n.recipient === "seller" ? "var(--sio-info-bg)" : "var(--sio-success-bg)",
                    color: n.recipient === "seller" ? "var(--sio-info)" : "var(--sio-success)",
                  }}
                >
                  To {n.recipient === "seller" ? "you" : "shopper"} · {TRIGGER_LABEL[n.trigger] ?? n.trigger}
                </span>
                <span style={{ fontSize: 12, color: "var(--sio-muted)" }}>{new Date(n.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--sio-ink-soft)", margin: 0 }}>{n.message}</p>
              <p style={{ fontSize: 11, color: "var(--sio-line)", marginTop: 6 }}>Sent to +91 {n.phone}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

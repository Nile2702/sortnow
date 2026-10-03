"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

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
  storeName: string;
  storeSlug: string;
  items: ReservationItem[];
  total: number;
  shopperName: string;
  shopperPhone: string;
  status: "pending" | "fulfilled" | "cancelled" | "expired";
  reservedUntil: string;
  createdAt: string;
}

const STATUS_COPY: Record<string, { title: string; icon: string; iconBg: string; iconFg: string }> = {
  pending: { title: "Reservation confirmed", icon: "⏱", iconBg: "#fef9c3", iconFg: "#854d0e" },
  fulfilled: { title: "Picked up", icon: "✓", iconBg: "#dcfce7", iconFg: "#16a34a" },
  cancelled: { title: "Reservation cancelled", icon: "✕", iconBg: "#f1f5f9", iconFg: "#64748b" },
  expired: { title: "Reservation expired", icon: "⏳", iconBg: "#fee2e2", iconFg: "#991b1b" },
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "Time's up";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export default function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [, forceTick] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    function load() {
      fetch(`/api/v1/reservations/${reservationId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setReservation)
        .catch(() => setNotFound(true));
    }
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [reservationId]);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Encodes this very page's own URL - scanning it (with the seller's own
  // phone at the counter, or anyone else's) opens the same reservation
  // detail view, a quick visual "this is real" check at pickup without
  // needing the shopper to read out an ID or the seller to look anything up
  // by hand. Same `qrcode` package the seller's own QR standee page already
  // uses, same pattern.
  useEffect(() => {
    if (typeof window === "undefined") return;
    QRCode.toDataURL(window.location.href, { width: 220, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [reservationId]);

  if (notFound) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <p>Reservation not found. It may have been created before the server last restarted (reservations are in-memory in this demo).</p>
        <Link href="/reservations" style={{ color: "#2563eb" }}>
          View my reservations
        </Link>
      </main>
    );
  }

  if (!reservation) {
    return <main style={{ maxWidth: 600, margin: "60px auto", padding: 16, textAlign: "center" }}>Loading…</main>;
  }

  const copy = STATUS_COPY[reservation.status] ?? STATUS_COPY.pending;
  const msLeft = new Date(reservation.reservedUntil).getTime() - Date.now();

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 16px" }}>
      <div className="sio-fade-in" style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: copy.iconBg,
            color: copy.iconFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 26,
          }}
        >
          {copy.icon}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{copy.title}</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          Reservation <strong>{reservation.id}</strong> at <strong>{reservation.storeName}</strong>
        </p>
      </div>

      {reservation.status === "pending" && (
        <>
          <div
            className="sio-breathe"
            style={{ background: "#fef9c3", color: "#854d0e", borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 16, fontWeight: 700 }}
          >
            {formatCountdown(msLeft)} · walk in before {new Date(reservation.reservedUntil).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f1f5f9",
              padding: 20,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#64748b", marginBottom: 12 }}>
              SHOW THIS AT THE STORE
            </div>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Reservation QR pass" width={180} height={180} style={{ margin: "0 auto", display: "block" }} />
            )}
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 10 }}>{reservation.id}</div>
          </div>
        </>
      )}

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16 }}>
        {reservation.items.map((item) => (
          <div key={`${item.productId}-${item.size}`} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
            <img src={item.imageUrl} alt={item.title} style={{ width: 60, height: 76, objectFit: "cover", borderRadius: 8 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Size {item.size} · Qty {item.quantity}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>₹{item.price * item.quantity}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, fontSize: 18, fontWeight: 700 }}>
          <span>Total (pay at store if purchased)</span>
          <span>₹{reservation.total}</span>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#64748b" }}>RESERVED UNDER</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{reservation.shopperName}</div>
        <div style={{ fontSize: 13, color: "#475569" }}>Phone: {reservation.shopperPhone}</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href={`/store/${reservation.storeSlug}`}
          style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontSize: 14 }}
        >
          View store
        </Link>
        <Link href="/reservations" style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontSize: 14 }}>
          My reservations
        </Link>
        <Link
          href="/"
          style={{ padding: "10px 20px", borderRadius: 999, background: "#0f172a", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
        >
          Continue browsing
        </Link>
      </div>
    </main>
  );
}

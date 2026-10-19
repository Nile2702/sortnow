"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { LoadingScreen } from "../../../components/LoadingSpinner";

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

// Just the fields this page needs for the "walk into the store" step -
// address, a tap-to-call number, and coordinates for a directions link.
// Fetched separately from the public store route (same one /store/[slug]
// and the map view already use) since Reservation itself only carries
// storeName/storeSlug, not the store's visit details.
interface StoreVisitInfo {
  name: string;
  city: string;
  pincode: string;
  localMarket: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

// A hold window under 15 minutes is treated as urgent - same red/alarm
// palette the "expired" status already uses elsewhere on this page, so a
// shopper who's about to lose their hold gets a visual nudge instead of the
// same calm yellow the whole window shows.
const URGENT_THRESHOLD_MS = 15 * 60 * 1000;

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
  const [store, setStore] = useState<StoreVisitInfo | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  // Store visit details (address/phone/coordinates) don't change on the
  // reservation's own polling cadence, so this is fetched once per store
  // rather than refetched alongside every 20s reservation poll.
  useEffect(() => {
    if (!reservation?.storeSlug) return;
    fetch(`/api/v1/stores/${reservation.storeSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStore)
      .catch(() => {});
  }, [reservation?.storeSlug]);

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

  async function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/v1/reservations/${reservationId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCancelError(data?.message || "Couldn't cancel this reservation. Try again.");
        setConfirmingCancel(false);
        return;
      }
      // Reflects the new cancelled state immediately, without waiting for
      // the next 20s poll in the effect above.
      setReservation(data);
      setConfirmingCancel(false);
    } catch {
      setCancelError("Couldn't cancel this reservation. Check your connection and try again.");
      setConfirmingCancel(false);
    } finally {
      setCancelling(false);
    }
  }

  if (notFound) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <p>Reservation not found. Double-check the link, or it may have expired or been cancelled.</p>
        <Link href="/reservations" style={{ color: "#1e3a8a" }}>
          View my reservations
        </Link>
      </main>
    );
  }

  if (!reservation) {
    return <LoadingScreen maxWidth={600} />;
  }

  const copy = STATUS_COPY[reservation.status] ?? STATUS_COPY.pending;
  const msLeft = new Date(reservation.reservedUntil).getTime() - Date.now();
  const isUrgent = msLeft > 0 && msLeft <= URGENT_THRESHOLD_MS;
  const directionsUrl = store ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}` : undefined;
  const storeAddress = store ? [store.localMarket, store.city].filter(Boolean).join(", ") + (store.pincode ? ` - ${store.pincode}` : "") : undefined;

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
            style={{
              background: isUrgent ? "#fee2e2" : "#fef9c3",
              color: isUrgent ? "#991b1b" : "#854d0e",
              borderRadius: 14,
              padding: 16,
              textAlign: "center",
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            {isUrgent ? "⚠ " : ""}
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

          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f1f5f9",
              padding: 16,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {cancelError && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 0, marginBottom: 10 }}>{cancelError}</p>}
            {confirmingCancel ? (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, color: "#334155", fontWeight: 600 }}>Cancel this reservation? This can't be undone.</span>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 999,
                    border: "none",
                    background: "#991b1b",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: cancelling ? "default" : "pointer",
                    opacity: cancelling ? 0.7 : 1,
                  }}
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel it"}
                </button>
                <button
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelling}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 999,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#0f172a",
                    fontSize: 13,
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
                  padding: "9px 20px",
                  borderRadius: 999,
                  border: "1px solid #fecaca",
                  background: "#fff",
                  color: "#991b1b",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel reservation
              </button>
            )}
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
            <div style={{ fontWeight: 700 }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, fontSize: 18, fontWeight: 700 }}>
          <span>Total (pay at store if purchased)</span>
          <span>₹{reservation.total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {store && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#64748b" }}>VISIT THE STORE</div>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: store.phone || directionsUrl ? 12 : 0 }}>{storeAddress}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {store.phone && (
              <a
                href={`tel:+91${store.phone}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  color: "#0f172a",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                📞 Call store
              </a>
            )}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  color: "#0f172a",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                🧭 Get directions
              </a>
            )}
          </div>
        </div>
      )}

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

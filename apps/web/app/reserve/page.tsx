"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, getCart, cartTotal } from "../../lib/cart";
import { addMyReservationId } from "../../lib/reservations";
import { getShopperSession } from "../../lib/shopper-session";

const DURATIONS = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
];

export default function ReservePage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [shopperName, setShopperName] = useState("");
  const [shopperPhone, setShopperPhone] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    const cart = getCart();
    setItems(cart);
    const shopper = getShopperSession();
    if (shopper) {
      setShopperName(shopper.name);
      setShopperPhone(shopper.phone);
    }
    if (cart.length === 0) router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid = shopperName.trim().length > 0 && /^\d{10}$/.test(shopperPhone);
  const storeCount = new Set(items.map((i) => i.storeSlug)).size;

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setReserving(true);

    const res = await fetch("/api/v1/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          storeSlug: i.storeSlug,
          size: i.size,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
        shopperName,
        shopperPhone,
        durationMinutes,
      }),
    });
    const created: { id: string }[] = await res.json();
    created.forEach((r) => addMyReservationId(r.id));

    window.localStorage.setItem("sio:cart", "[]");
    window.dispatchEvent(new Event("sio:cart-updated"));

    router.push(created.length === 1 ? `/reservations/${created[0].id}` : "/reservations");
  }

  if (items.length === 0) return null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, fontWeight: 700 }}>Reserve for Pickup</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
        <form onSubmit={handleReserve} className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Your Details</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>The seller uses this to know who's coming and confirm the hold.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input required value={shopperName} onChange={(e) => setShopperName(e.target.value)} style={fieldStyle} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label style={labelStyle}>Phone number</label>
              <input
                required
                value={shopperPhone}
                onChange={(e) => setShopperPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                style={fieldStyle}
                placeholder="10-digit mobile number"
                inputMode="numeric"
              />
            </div>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "24px 0 4px" }}>Hold Duration</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            {storeCount > 1
              ? `Applies to each of the ${storeCount} stores' reservations.`
              : "How long should the store hold this for you?"}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DURATIONS.map((d) => (
              <button
                type="button"
                key={d.minutes}
                onClick={() => setDurationMinutes(d.minutes)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: durationMinutes === d.minutes ? "2px solid #0f172a" : "1px solid #e2e8f0",
                  background: durationMinutes === d.minutes ? "#0f172a" : "#fff",
                  color: durationMinutes === d.minutes ? "#fff" : "#0f172a",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!isValid || reserving}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px",
              borderRadius: 999,
              border: "none",
              background: !isValid || reserving ? "#cbd5e1" : "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: !isValid || reserving ? "not-allowed" : "pointer",
            }}
          >
            {reserving ? "Reserving…" : "Confirm Reservation"}
          </button>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, textAlign: "center" }}>
            No payment is taken now — pay the store when you pick it up.
          </p>
        </form>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sort Summary</h2>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 20 }}>
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}`} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <img src={item.imageUrl} alt={item.title} style={{ width: 50, height: 64, objectFit: "cover", borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {item.storeName} · Size {item.size} · Qty {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>₹{item.price * item.quantity}</div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span>₹{cartTotal(items)}</span>
            </div>
          </div>
          <Link href="/cart" style={{ display: "inline-block", marginTop: 14, fontSize: 13, color: "#64748b" }}>
            ← Back to your sort
          </Link>
        </div>
      </div>
    </main>
  );
}

const fieldStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" };

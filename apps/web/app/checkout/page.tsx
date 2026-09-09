"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, getCart, cartTotal } from "../../lib/cart";
import { addMyOrderId } from "../../lib/orders";
import { getSavedAddress, saveAddress, ShippingAddress } from "../../lib/address";
import { getShopperSession } from "../../lib/shopper-session";

const EMPTY_ADDRESS: ShippingAddress = { fullName: "", phone: "", line1: "", city: "", pincode: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    const cart = getCart();
    setItems(cart);
    const saved = getSavedAddress();
    if (saved) {
      setAddress(saved);
    } else {
      const shopper = getShopperSession();
      if (shopper) setAddress((a) => ({ ...a, fullName: shopper.name, phone: shopper.phone }));
    }
    if (cart.length === 0) router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof ShippingAddress>(key: K, value: string) {
    setAddress((a) => ({ ...a, [key]: value }));
  }

  const isValid = address.fullName.trim() && /^\d{10}$/.test(address.phone) && address.line1.trim() && address.city.trim() && /^\d{6}$/.test(address.pincode);

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setPlacing(true);
    saveAddress(address);

    const res = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          title: i.title,
          storeName: i.storeName,
          size: i.size,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
        shippingAddress: address,
      }),
    });
    const order = await res.json();
    addMyOrderId(order.id);
    window.localStorage.setItem("sio:cart", "[]");
    window.dispatchEvent(new Event("sio:cart-updated"));
    router.push(`/orders/${order.id}`);
  }

  if (items.length === 0) return null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, fontWeight: 700 }}>Checkout</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
        <form onSubmit={handlePlaceOrder} className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Shipping Address</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input required value={address.fullName} onChange={(e) => update("fullName", e.target.value)} style={fieldStyle} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label style={labelStyle}>Phone number</label>
              <input
                required
                value={address.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                style={fieldStyle}
                placeholder="10-digit mobile number"
                inputMode="numeric"
              />
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <textarea
                required
                value={address.line1}
                onChange={(e) => update("line1", e.target.value)}
                rows={2}
                style={{ ...fieldStyle, resize: "vertical" }}
                placeholder="House no., street, landmark"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input required value={address.city} onChange={(e) => update("city", e.target.value)} style={fieldStyle} placeholder="e.g. Mumbai" />
              </div>
              <div>
                <label style={labelStyle}>PIN code</label>
                <input
                  required
                  value={address.pincode}
                  onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  style={fieldStyle}
                  placeholder="6-digit PIN"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || placing}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px",
              borderRadius: 999,
              border: "none",
              background: !isValid || placing ? "#cbd5e1" : "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: !isValid || placing ? "not-allowed" : "pointer",
            }}
          >
            {placing ? "Placing order…" : `Place Order — ₹${cartTotal(items)}`}
          </button>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, textAlign: "center" }}>
            No real payment gateway in this demo — see docs/04-monetization-and-billing.md for the Razorpay/Cashfree flow.
          </p>
        </form>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Order Summary</h2>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 20 }}>
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}`} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <img src={item.imageUrl} alt={item.title} style={{ width: 50, height: 64, objectFit: "cover", borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Size {item.size} · Qty {item.quantity}
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
            ← Back to cart
          </Link>
        </div>
      </div>
    </main>
  );
}

const fieldStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" };

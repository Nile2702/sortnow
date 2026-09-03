"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartItem, getCart, removeFromCart, updateQuantity, cartTotal } from "../../lib/cart";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [placedOrder, setPlacedOrder] = useState(false);

  useEffect(() => {
    setItems(getCart());
  }, []);

  function refresh() {
    setItems(getCart());
  }

  function handleCheckout() {
    // No payment gateway wired up in this demo — see docs/04-monetization-and-billing.md
    // for the real Razorpay/Cashfree checkout flow this button stands in for.
    setPlacedOrder(true);
    window.localStorage.setItem("sio:cart", "[]");
    setItems([]);
  }

  if (placedOrder) {
    return (
      <main style={{ maxWidth: 600, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 24 }}>Order placed (demo)</h1>
        <p style={{ color: "#64748b" }}>
          In production this would hand off to Razorpay/Cashfree checkout, per{" "}
          <code>docs/04-monetization-and-billing.md</code>. No real payment was taken.
        </p>
        <Link href="/" style={{ color: "#2563eb" }}>
          ← Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Your Cart</h1>

      {items.length === 0 ? (
        <p>
          Your cart is empty.{" "}
          <Link href="/" style={{ color: "#2563eb" }}>
            Go find something nearby
          </Link>
          .
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                style={{ display: "flex", gap: 16, background: "#fff", padding: 16, borderRadius: 12, alignItems: "center" }}
              >
                <img src={item.imageUrl} alt={item.title} style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {item.storeName} · Size {item.size}
                  </div>
                  <div style={{ marginTop: 6 }}>₹{item.price}</div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    updateQuantity(item.productId, item.size, Number(e.target.value));
                    refresh();
                  }}
                  style={{ width: 56, padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }}
                />
                <button
                  onClick={() => {
                    removeFromCart(item.productId, item.size);
                    refresh();
                  }}
                  style={{ border: "none", background: "none", color: "#e11d48", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Total: ₹{cartTotal(items)}</div>
            <button
              onClick={handleCheckout}
              style={{ padding: "14px 28px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 16, cursor: "pointer" }}
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </main>
  );
}

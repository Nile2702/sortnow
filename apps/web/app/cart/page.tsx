"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, getCart, removeFromCart, updateQuantity, cartTotal } from "../../lib/cart";
import { addMyOrderId } from "../../lib/orders";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    setItems(getCart());
  }, []);

  function refresh() {
    setItems(getCart());
  }

  async function handleCheckout() {
    // No real payment gateway wired up - see docs/04-monetization-and-billing.md
    // for the Razorpay/Cashfree flow this stands in for. The order itself is
    // real (server-side, in-memory) so the confirmation/history pages work.
    setPlacing(true);
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
      }),
    });
    const order = await res.json();
    addMyOrderId(order.id);
    window.localStorage.setItem("sio:cart", "[]");
    window.dispatchEvent(new Event("sio:cart-updated"));
    router.push(`/orders/${order.id}`);
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, fontWeight: 700 }}>Your Cart</h1>

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
                className="sio-card"
                style={{ display: "flex", gap: 16, background: "#fff", padding: 16, borderRadius: 14, alignItems: "center", border: "1px solid #f1f5f9" }}
              >
                <img src={item.imageUrl} alt={item.title} style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {item.storeName} · Size {item.size}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>₹{item.price}</div>
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
              disabled={placing}
              style={{
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: placing ? "#94a3b8" : "#0f172a",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: placing ? "default" : "pointer",
              }}
            >
              {placing ? "Placing order…" : "Checkout"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

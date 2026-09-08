"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, getCart, removeFromCart, updateQuantity, cartTotal } from "../../lib/cart";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  function refresh() {
    setItems(getCart());
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
              onClick={() => router.push("/checkout")}
              style={{
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </main>
  );
}

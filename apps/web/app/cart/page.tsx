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
      <h1 style={{ fontSize: 24, marginBottom: 4, fontWeight: 700 }}>Your Sort</h1>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
        Pick out what you want, then reserve it at the store for a set time so it's held for you to walk in and try on or buy.
      </p>

      {items.length === 0 ? (
        <p>
          Your sort is empty.{" "}
          <Link href="/" style={{ color: "#1e3a8a" }}>
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
                style={{ display: "flex", flexWrap: "wrap", gap: 16, background: "#fff", padding: 16, borderRadius: 14, alignItems: "center", border: "1px solid #f1f5f9" }}
              >
                <img src={item.imageUrl} alt={item.title} style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                {/* minWidth: 0 lets this shrink/wrap normally within the flex
                    row - without it, the title had no minimum-size override
                    so the row squeezed it down to its narrowest word instead
                    of using the space actually available. */}
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {item.storeName} · Size {item.size}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>₹{item.price}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
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
                    style={{ border: "none", background: "none", color: "#e11d48", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {new Set(items.map((i) => i.storeSlug)).size > 1 && (
            <p style={{ fontSize: 12, color: "#b45309", marginTop: 16 }}>
              These items are from {new Set(items.map((i) => i.storeSlug)).size} different stores — reserving will create a separate reservation at
              each store, since you'll need to visit each in person.
            </p>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Total: ₹{cartTotal(items)}</div>
            <button
              onClick={() => router.push("/reserve")}
              className="sio-shine-btn"
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
              Reserve for Pickup
            </button>
          </div>
        </>
      )}
    </main>
  );
}

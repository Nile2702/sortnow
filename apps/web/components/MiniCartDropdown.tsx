"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart, cartTotal, removeFromCart, CartItem } from "../lib/cart";

const MAX_VISIBLE_ITEMS = 4;

// Hover/tap preview of the cart shown from the header's cart icon, so
// checking what's in the sort (and the running total) doesn't require a
// full navigation to /cart every time - see SiteHeader's CartMenu for the
// open/close wrapper that renders this. Visually matches the dropdown
// pattern already used for the header's search suggestions and category
// menus (`sio-dropdown`, var(--sio-paper) background, 16px radius).
export function MiniCartDropdown({ onNavigate }: { onNavigate?: () => void }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(getCart());
    refresh();
    window.addEventListener("sio:cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sio:cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const visible = items.slice(0, MAX_VISIBLE_ITEMS);
  const extra = items.length - visible.length;
  const total = cartTotal(items);

  return (
    <div
      className="sio-dropdown"
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        background: "var(--sio-paper)",
        border: "1px solid var(--sio-line)",
        borderRadius: 16,
        boxShadow: "0 16px 32px rgba(22,20,15,0.12)",
        padding: 10,
        width: 300,
        zIndex: 30,
      }}
    >
      {items.length === 0 ? (
        <div style={{ padding: "18px 10px", textAlign: "center", fontSize: 13, color: "var(--sio-muted)" }}>
          Your sort is empty
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
            {visible.map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 10 }}
              >
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: "var(--sio-cream)" }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--sio-ink)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--sio-muted)" }}>
                    Size {item.size}
                    {item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0, color: "var(--sio-ink)" }}>
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId, item.size)}
                  aria-label={`Remove ${item.title} from your sort`}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sio-muted)",
                    cursor: "pointer",
                    padding: 4,
                    flexShrink: 0,
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {extra > 0 && (
            <div style={{ padding: "4px 6px 0", fontSize: 12, color: "var(--sio-muted)" }}>+{extra} more</div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 6px 4px",
              marginTop: 4,
              borderTop: "1px solid var(--sio-line)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--sio-ink)",
            }}
          >
            <span>Total</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>
          <Link
            href="/cart"
            onClick={onNavigate}
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 999,
              background: "var(--sio-ink)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View Sort
          </Link>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart, cartCount } from "../lib/cart";

export function SiteHeader() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(cartCount(getCart()));
    refresh();
    window.addEventListener("sio:cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sio:cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "16px",
      }}
    >
      <Link href="/" style={{ fontSize: 20, fontWeight: 800, textDecoration: "none", color: "#0f172a" }}>
        SORT IT <span style={{ color: "#2563eb" }}>OUT</span>
      </Link>
      <nav style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 14 }}>
        <Link href="/sorts" style={{ color: "#475569", textDecoration: "none" }}>
          My Sorts
        </Link>
        <Link href="/cart" style={{ color: "#0f172a", textDecoration: "none", position: "relative" }}>
          Cart
          {count > 0 && (
            <span
              style={{
                position: "absolute",
                top: -10,
                right: -14,
                background: "#e11d48",
                color: "#fff",
                borderRadius: 999,
                fontSize: 11,
                padding: "1px 6px",
              }}
            >
              {count}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}

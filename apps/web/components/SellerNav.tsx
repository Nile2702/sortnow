"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSellerStoreSlug, setSellerStoreSlug } from "../lib/seller-session";

const TABS = [
  { label: "Dashboard", href: "/seller" },
  { label: "Products", href: "/seller/products" },
  { label: "Theme Studio", href: "/seller/theme" },
  { label: "QR Marketing", href: "/seller/qr" },
  { label: "Analytics", href: "/seller/analytics" },
  { label: "Billing", href: "/seller/billing" },
  { label: "Onboarding", href: "/seller/onboarding" },
];

export function SellerNav() {
  const pathname = usePathname();
  const [stores, setStores] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    setSelected(getSellerStoreSlug());
    fetch("/api/v1/seller/stores")
      .then((r) => r.json())
      .then(setStores);
  }, []);

  return (
    <div style={{ background: "#0f172a", color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
          🏪 Seller Portal
        </div>

        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setSellerStoreSlug(e.target.value);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: 13,
          }}
        >
          {stores.map((s) => (
            <option key={s.slug} value={s.slug} style={{ color: "#0f172a" }}>
              {s.name}
            </option>
          ))}
        </select>

        <nav style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  color: active ? "#0f172a" : "#cbd5e1",
                  background: active ? "#fff" : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", whiteSpace: "nowrap" }}>
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

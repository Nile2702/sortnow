"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSellerStore } from "../lib/use-seller-store";

const TABS = [
  { label: "Dashboard", href: "/seller" },
  { label: "Products", href: "/seller/products" },
  { label: "Reservations", href: "/seller/reservations" },
  { label: "Theme Studio", href: "/seller/theme" },
  { label: "QR Marketing", href: "/seller/qr" },
  { label: "Analytics", href: "/seller/analytics" },
  { label: "Billing", href: "/seller/billing" },
  { label: "AI Photo Credits", href: "/seller/photo-credits" },
  { label: "Onboarding", href: "/seller/onboarding" },
];

export function SellerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { store } = useSellerStore();

  async function handleLogout() {
    await fetch("/api/v1/seller/auth/logout", { method: "POST" });
    router.push("/seller/login");
    router.refresh();
  }

  return (
    <div style={{ background: "#0f172a", color: "#fff" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
          🏪 Seller Portal
        </div>

        {store && (
          <div style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "nowrap" }}>{store.name}</div>
        )}

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

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: "#cbd5e1",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sign out
        </button>

        <Link href="/" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", whiteSpace: "nowrap" }}>
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

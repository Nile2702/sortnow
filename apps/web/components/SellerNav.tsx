"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSellerStore } from "../lib/use-seller-store";

const TABS = [
  { label: "Dashboard", href: "/seller" },
  { label: "Products", href: "/seller/products" },
  { label: "Reservations", href: "/seller/reservations" },
  { label: "Sales", href: "/seller/sales" },
  { label: "Notifications", href: "/seller/notifications" },
  { label: "Theme Studio", href: "/seller/theme" },
  { label: "QR Marketing", href: "/seller/qr" },
  { label: "Analytics & Reports", href: "/seller/analytics" },
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
    <div className="sio-print-hide" style={{ background: "#0f172a", color: "#fff" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
          🏪 Seller Portal
        </div>

        {store && (
          <div style={{ fontSize: 13, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{store.name}</div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
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

      {/* A dedicated, horizontally-scrollable row rather than letting these
          11 tabs wrap inline with the brand/store/actions above - with this
          many tabs, wrapping broke the `marginLeft: auto` alignment the
          moment the tabs spilled onto their own line (nothing left on that
          line to push away from), leaving Sign out/Back to site stranded at
          the left edge instead of the right. A fixed scrollable strip avoids
          that regardless of viewport width or how many tabs are added later. */}
      <nav
        className="sio-scroll-row"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "10px 20px 14px",
          display: "flex",
          gap: 4,
          overflowX: "auto",
        }}
      >
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
                flexShrink: 0,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

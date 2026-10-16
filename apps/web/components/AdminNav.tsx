"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FullLogo } from "./LogoBadge";

const TABS = [
  { label: "Seller review queue", href: "/admin/sellers" },
  { label: "Active sellers", href: "/admin/sellers/active" },
  { label: "Product moderation", href: "/admin/products" },
];

// Every /admin/* page previously had no chrome of its own at all - they sat
// inside the root layout, so an admin moderating a seller saw the ordinary
// shopper SiteHeader (Men/Women/Kids nav, search, wishlist), the pincode
// LocationGate popup, and the shopper Footer's "Popular markets" links,
// none of which make any sense for a shared-secret-gated moderation tool.
// This mirrors SellerNav's own dark portal bar (same --sio-ink background,
// same badge-pill pattern) so the two internal tools read as one consistent
// "this isn't the storefront" visual language, not two different kinds of
// one-off. Each of the 4 admin pages used to build its own copy of this
// same cross-page nav inline (with the ?key= carried through by hand) -
// consolidated here once instead.
export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const keyQS = `?key=${encodeURIComponent(searchParams.get("key") ?? "")}`;

  return (
    <div className="sio-print-hide" style={{ background: "var(--sio-ink)", color: "#fff" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <FullLogo height={34} chip />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#fecaca",
              border: "1px solid rgba(248,113,113,0.5)",
              borderRadius: 999,
              padding: "3px 9px",
            }}
          >
            Admin
          </span>
        </div>

        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={`${tab.href}${keyQS}`}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? "var(--sio-ink)" : "#cbd5e1",
                  background: active ? "#fff" : "transparent",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FullLogo } from "./LogoBadge";

const TABS = [
  { label: "Seller review queue", href: "/admin/sellers" },
  { label: "Active sellers", href: "/admin/sellers/active" },
  { label: "Product moderation", href: "/admin/products" },
  { label: "Customers & Footfall", href: "/admin/customers" },
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
// consolidated here once instead, and the key threading itself dropped
// entirely now that a session cookie travels automatically (see
// lib/admin-session.ts) - no more manually passing it from link to link.
export function AdminNav() {
  const pathname = usePathname();
  // The login page has no session yet - showing a nav bar full of
  // moderation tabs there would be misleading (and clicking one would just
  // bounce straight back to /admin/login anyway).
  if (pathname === "/admin/login") return null;

  const activeHref = [...TABS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))?.href;

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
            // /admin/sellers/active starts with /admin/sellers, so a plain
            // "does my href prefix-match the path" check marks both "Seller
            // review queue" and "Active sellers" active at once on the
            // Active sellers page. Picking only the longest (most specific)
            // matching href - computed once below, same for every tab in
            // this render - keeps a seller detail page like
            // /admin/sellers/<id> falling back to "Seller review queue"
            // (nothing more specific claims it) while a real sibling route
            // like /admin/sellers/active takes precedence over it.
            const active = tab.href === activeHref;
            return (
              <Link
                key={tab.href}
                href={tab.href}
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

        <form method="post" action="/api/v1/admin/logout" style={{ marginLeft: "auto" }}>
          <button
            type="submit"
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#cbd5e1",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

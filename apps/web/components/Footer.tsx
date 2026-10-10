"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoBadge } from "./LogoBadge";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Men", href: "/category/men" },
      { label: "Women", href: "/category/women" },
      { label: "Kids", href: "/category/kids" },
      { label: "All Shops", href: "/shops" },
      { label: "My Sorts", href: "/sorts" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Wishlist", href: "/wishlist" },
      { label: "Your Sort", href: "/cart" },
      { label: "My Reservations", href: "/reservations" },
      { label: "Sign in", href: "/account" },
    ],
  },
  {
    title: "Popular markets",
    links: [
      { label: "Bandra, Mumbai", href: "/?pincode=400050" },
      { label: "Commercial Street, Bengaluru", href: "/?pincode=560001" },
      { label: "T. Nagar, Chennai", href: "/?pincode=600017" },
      { label: "Chandni Chowk, Delhi", href: "/?pincode=110006" },
      { label: "Charminar, Hyderabad", href: "/?pincode=500002" },
      { label: "FC Road, Pune", href: "/?pincode=411005" },
      { label: "Gariahat, Kolkata", href: "/?pincode=700019" },
    ],
  },
  {
    title: "For Merchants",
    links: [
      { label: "Seller Portal", href: "/seller" },
      { label: "List Your Store", href: "/seller/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Refund & Cancellation", href: "/legal/refund-policy" },
    ],
  },
];

// The seller portal gets the same branded footer, but with merchant-facing
// columns - the shopper footer's "Popular markets"/category links under a
// merchant's dashboard were just confusing clutter.
const SELLER_COLUMNS = [
  {
    title: "Your Store",
    links: [
      { label: "Dashboard", href: "/seller" },
      { label: "Products", href: "/seller/products" },
      { label: "Reservations", href: "/seller/reservations" },
      { label: "Sales", href: "/seller/sales" },
    ],
  },
  {
    title: "Grow",
    links: [
      { label: "Theme Studio", href: "/seller/theme" },
      { label: "QR Marketing", href: "/seller/qr" },
      { label: "Analytics & Reports", href: "/seller/analytics" },
      { label: "AI Photo Credits", href: "/seller/photo-credits" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Billing", href: "/seller/billing" },
      { label: "Onboarding", href: "/seller/onboarding" },
      { label: "Visit SORT NOW", href: "/" },
    ],
  },
  COLUMNS[COLUMNS.length - 1],
];

export function Footer() {
  const pathname = usePathname();
  const isSeller = pathname.startsWith("/seller");
  const columns = isSeller ? SELLER_COLUMNS : COLUMNS;

  return (
    <footer className="sio-print-hide" style={{ background: "var(--sio-ink)", color: "#c9c4b8", marginTop: isSeller ? 0 : 48 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "48px 16px 28px", display: "flex", flexWrap: "wrap", gap: 40 }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <LogoBadge size={30} />
            <span style={{ fontFamily: "var(--site-font-heading)", fontWeight: 600, fontSize: 22, letterSpacing: "0.03em", color: "#fff" }}>
              SORT NOW
            </span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#a39d8f", maxWidth: 260 }}>
            {isSeller
              ? "Seller Portal — list your catalog, take reservations and bring nearby shoppers into your store."
              : "Find apparel near you, sort it online and walk into the store."}
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title} style={{ minWidth: 140 }}>
            <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 600, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", color: "#fff", marginBottom: 14 }}>
              {col.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "#a39d8f", textDecoration: "none" }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "18px",
          textAlign: "center",
          fontSize: 12,
          color: "#7a7468",
        }}
      >
        © {new Date().getFullYear()} SORT NOW — a demo platform for Indian O2O fashion discovery.
      </div>
    </footer>
  );
}

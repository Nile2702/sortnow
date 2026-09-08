import Link from "next/link";

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
      { label: "Cart", href: "/cart" },
      { label: "Order History", href: "/orders" },
      { label: "Sign in", href: "/account" },
    ],
  },
  {
    title: "Popular markets",
    links: [
      { label: "Bandra, Mumbai", href: "/?pincode=400050" },
      { label: "Commercial Street, Bengaluru", href: "/?pincode=560001" },
      { label: "T. Nagar, Chennai", href: "/?pincode=600017" },
    ],
  },
  {
    title: "For Merchants",
    links: [
      { label: "Seller Portal", href: "/seller" },
      { label: "List Your Store", href: "/seller/onboarding" },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ background: "#0f172a", color: "#cbd5e1", marginTop: 48 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px 24px", display: "flex", flexWrap: "wrap", gap: 40 }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 800, fontSize: 20, color: "#fff", marginBottom: 8 }}>
            SORT IT <span style={{ color: "#60a5fa" }}>OUT</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#94a3b8", maxWidth: 260 }}>
            Find apparel near you, sort it your way, and shop it online or walk into the store.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title} style={{ minWidth: 140 }}>
            <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 600, fontSize: 13, color: "#fff", marginBottom: 12 }}>
              {col.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>
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
          padding: "16px",
          textAlign: "center",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        © {new Date().getFullYear()} SORT IT OUT — a demo platform for Indian O2O fashion discovery.
      </div>
    </footer>
  );
}

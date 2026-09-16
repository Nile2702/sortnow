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
      { label: "List Your Store", href: "/seller/onboarding" },
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

export function Footer() {
  return (
    <footer style={{ background: "var(--sio-ink)", color: "#c9c4b8", marginTop: 48 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "48px 16px 28px", display: "flex", flexWrap: "wrap", gap: 40 }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 600, fontSize: 22, letterSpacing: "0.03em", color: "#fff", marginBottom: 10 }}>
            SORT IT <span style={{ color: "var(--sio-bronze)" }}>OUT</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#a39d8f", maxWidth: 260 }}>
            Find apparel near you, sort it online and walk into the store.
          </p>
        </div>

        {COLUMNS.map((col) => (
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
        © {new Date().getFullYear()} SORT IT OUT — a demo platform for Indian O2O fashion discovery.
      </div>
    </footer>
  );
}

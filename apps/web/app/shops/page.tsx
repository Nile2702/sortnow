"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StoreRatingBadge } from "../../components/StoreRatingBadge";

interface Shop {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  pincode: string;
  localMarket: string;
  productCount: number;
  rating: { average: number; count: number };
  liveSale?: { headline: string; discountLabel: string; endsAt: string } | null;
  boostedUntil?: string | null;
}

function isSaleActive(sale?: Shop["liveSale"]) {
  return !!sale && new Date(sale.endsAt).getTime() > Date.now();
}

function isBoosted(boostedUntil?: string | null) {
  return !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
}

function SkeletonCard() {
  return <div className="sio-skeleton" style={{ borderRadius: 14, height: 110 }} />;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetch("/api/v1/shops")
      .then((r) => r.json())
      .then(setShops)
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => Array.from(new Set(shops.map((s) => s.city))).sort(), [shops]);
  const categories = useMemo(() => Array.from(new Set(shops.map((s) => s.category))).sort(), [shops]);

  const filtered = shops.filter((s) => {
    const matchesQuery = !query.trim() || s.name.toLowerCase().includes(query.trim().toLowerCase()) || s.city.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "all" || s.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 16px 48px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Explore All Shops</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Every boutique and store listed on SORT IT OUT — {shops.length > 0 ? `${shops.length} and counting` : "browse and pick one to shop"}.
      </p>

      <section
        className="sio-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          background: "#fff",
          padding: 16,
          borderRadius: 16,
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
          marginBottom: 28,
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shops or cities…"
          style={{ flex: "1 1 220px", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setCategory("all")} style={pillStyle(category === "all")}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} style={{ ...pillStyle(category === c), textTransform: "capitalize" }}>
              {c}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#64748b" }}>No shops match your search.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {filtered.map((s, i) => (
            <Link
              key={s.id}
              href={`/store/${s.slug}`}
              className="sio-card sio-fade-in"
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                background: "#fff",
                borderRadius: 14,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                border: "1px solid #f1f5f9",
                boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                animationDelay: `${i * 40}ms`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `hsl(${(s.name.charCodeAt(0) * 37) % 360}, 60%, 92%)`,
                  color: `hsl(${(s.name.charCodeAt(0) * 37) % 360}, 45%, 35%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {s.name.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{s.name}</h3>
                  {isBoosted(s.boostedUntil) && (
                    <span
                      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", color: "#b45309", border: "1px solid #d97706", borderRadius: 999, padding: "1px 7px", textTransform: "uppercase" }}
                    >
                      ⚡ Featured
                    </span>
                  )}
                  {isSaleActive(s.liveSale) && (
                    <span
                      className="sio-breathe"
                      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 999, padding: "1px 7px", textTransform: "uppercase" }}
                    >
                      ● Live
                    </span>
                  )}
                </div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
                  {s.localMarket}, {s.city}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, textTransform: "capitalize" }}>
                  {s.category} · {s.productCount} products
                </div>
                {s.rating.count > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <StoreRatingBadge average={s.rating.average} count={s.rating.count} />
                  </div>
                )}
                {isSaleActive(s.liveSale) && (
                  <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4, fontWeight: 600 }}>{s.liveSale!.discountLabel}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
    background: active ? "#0f172a" : "#fff",
    color: active ? "#fff" : "#0f172a",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  };
}

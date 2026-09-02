"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DiscoveredStore {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  localMarket: string;
  distanceKm: number | null;
  hasLiveSale: boolean;
}

const QUICK_MARKETS = [
  { label: "Bandra, Mumbai", pincode: "400050" },
  { label: "Commercial Street, Bengaluru", pincode: "560001" },
  { label: "T. Nagar, Chennai", pincode: "600017" },
  { label: "Chandni Chowk, Delhi", pincode: "110006" },
];

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Ethnic", value: "ethnic" },
  { label: "Western", value: "western" },
];

export default function DiscoverPage() {
  const [pincode, setPincode] = useState("400050");
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState("all");
  const [stores, setStores] = useState<DiscoveredStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ pincode, radius: String(radius), category });
    fetch(`/api/v1/discover?${params}`)
      .then((r) => r.json())
      .then(setStores)
      .finally(() => setLoading(false));
  }, [pincode, radius, category]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>
          SORT IT <span style={{ color: "#2563eb" }}>OUT</span>
        </h1>
        <p style={{ color: "#475569", marginTop: 4 }}>
          Find apparel near you. Sort it. Shop it — online or in the store.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          marginBottom: 16,
        }}
      >
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit PIN code"
          maxLength={6}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 16, width: 200 }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          Radius
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            {[1, 3, 5, 10, 15, 25].map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: category === c.value ? "#0f172a" : "#fff",
                color: category === c.value ? "#fff" : "#0f172a",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Popular markets</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QUICK_MARKETS.map((m) => (
            <button
              key={m.pincode}
              onClick={() => setPincode(m.pincode)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: pincode === m.pincode ? "#e0e7ff" : "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <p>Loading nearby stores…</p>
      ) : stores.length === 0 ? (
        <p>No stores found within {radius} km of {pincode}. Try widening the radius.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {stores.map((s) => (
            <Link
              key={s.id}
              href={`/store/${s.slug}`}
              style={{
                display: "block",
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{s.name}</h3>
                {s.hasLiveSale && (
                  <span style={{ background: "#e11d48", color: "#fff", fontSize: 11, padding: "3px 8px", borderRadius: 999 }}>
                    LIVE SALE
                  </span>
                )}
              </div>
              <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
                {s.localMarket}, {s.city} · {s.category}
              </div>
              {s.distanceKm != null && (
                <div style={{ fontSize: 13, marginTop: 8, color: "#2563eb" }}>{s.distanceKm} km away</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

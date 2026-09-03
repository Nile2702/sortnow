"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ALL_SIZES } from "../lib/seed-data";
import { saveSmartSort } from "../lib/smart-sorts";

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

interface SearchProduct {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  storeSlug: string;
  storeName: string;
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

function DiscoverPageInner() {
  const searchParams = useSearchParams();

  const [pincode, setPincode] = useState(searchParams.get("pincode") ?? "400050");
  const [radius, setRadius] = useState(Number(searchParams.get("radius") ?? 10));
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "distance");

  const [stores, setStores] = useState<DiscoveredStore[]>([]);
  const [sortedProducts, setSortedProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const hasAdvancedFilters = Boolean(minPrice || maxPrice || size || sortBy !== "distance");

  useEffect(() => {
    setLoading(true);
    const storeParams = new URLSearchParams({ pincode, radius: String(radius), category });
    const productParams = new URLSearchParams({ pincode, radius: String(radius), category, sort: sortBy });
    if (minPrice) productParams.set("minPrice", minPrice);
    if (maxPrice) productParams.set("maxPrice", maxPrice);
    if (size) productParams.set("size", size);

    Promise.all([
      fetch(`/api/v1/discover?${storeParams}`).then((r) => r.json()),
      fetch(`/api/v1/products/search?${productParams}`).then((r) => r.json()),
    ])
      .then(([storeResults, productResults]) => {
        setStores(storeResults);
        setSortedProducts(productResults);
      })
      .finally(() => setLoading(false));
  }, [pincode, radius, category, minPrice, maxPrice, size, sortBy]);

  function handleSaveSort() {
    if (!saveName.trim()) return;
    saveSmartSort(saveName.trim(), {
      pincode,
      radiusKm: radius,
      category,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      size: size || undefined,
      sort: sortBy,
    });
    setSaveName("");
    setSavedMsg(`Saved as "${saveName.trim()}" — find it under My Sorts.`);
    setTimeout(() => setSavedMsg(""), 3000);
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 40px" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ color: "#475569", marginTop: 4 }}>Find apparel near you. Sort it. Shop it — online or in the store.</p>
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

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Stores near you</h2>
      {loading ? (
        <p>Loading nearby stores…</p>
      ) : stores.length === 0 ? (
        <p>
          No stores found within {radius} km of {pincode}. Try widening the radius.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
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
              {s.distanceKm != null && <div style={{ fontSize: 13, marginTop: 8, color: "#2563eb" }}>{s.distanceKm} km away</div>}
            </Link>
          ))}
        </div>
      )}

      <section style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Shop in Sort</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
          Sort products across every nearby store at once, then save the sort to shop it again later.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <input
            type="number"
            placeholder="Min ₹"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{ width: 100, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
          <input
            type="number"
            placeholder="Max ₹"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: 100, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
          <select value={size} onChange={(e) => setSize(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
            <option value="">Any size</option>
            {ALL_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
            <option value="distance">Nearest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest first</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <input
            placeholder="Name this sort, e.g. 'Cotton kurtis under 1500 near home'"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 220 }}
          />
          <button
            onClick={handleSaveSort}
            disabled={!saveName.trim()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: saveName.trim() ? "#0f172a" : "#cbd5e1",
              color: "#fff",
              cursor: saveName.trim() ? "pointer" : "not-allowed",
            }}
          >
            Save this Sort
          </button>
          {savedMsg && <span style={{ fontSize: 13, color: "#16a34a" }}>{savedMsg}</span>}
        </div>

        {!loading && sortedProducts.length === 0 && <p style={{ color: "#64748b" }}>No products match this sort yet.</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {sortedProducts.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              style={{ textDecoration: "none", color: "inherit", borderRadius: 10, overflow: "hidden", border: "1px solid #f1f5f9" }}
            >
              <img src={p.images?.[0]?.url} alt={p.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{p.storeName}</div>
                <div style={{ marginTop: 4 }}>
                  ₹{p.basePrice}
                  {p.compareAtPrice && (
                    <span style={{ textDecoration: "line-through", marginLeft: 6, opacity: 0.6, fontSize: 12 }}>₹{p.compareAtPrice}</span>
                  )}
                </div>
                {p.hasLiveSale && <div style={{ fontSize: 11, color: "#e11d48", marginTop: 2 }}>LIVE SALE</div>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>Loading…</main>}>
      <DiscoverPageInner />
    </Suspense>
  );
}

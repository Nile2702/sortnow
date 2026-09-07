"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ALL_SIZES, CATEGORY_TREE } from "../lib/seed-data";
import { saveSmartSort } from "../lib/smart-sorts";
import { toggleWishlist, isWishlisted } from "../lib/wishlist";
import { HeroSlider } from "../components/HeroSlider";

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

function SkeletonCard({ height = 220 }: { height?: number }) {
  return <div className="sio-skeleton" style={{ borderRadius: 12, height }} />;
}

function HeartButton({ product, size = 18 }: { product: SearchProduct; size?: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => setOn(isWishlisted(product.id)), [product.id]);

  return (
    <button
      className="sio-heart-btn"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowOn = toggleWishlist({
          productId: product.id,
          title: product.title,
          storeSlug: product.storeSlug,
          storeName: product.storeName,
          price: product.basePrice,
          imageUrl: product.images?.[0]?.url ?? "",
        });
        setOn(nowOn);
      }}
      aria-label="Toggle wishlist"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: on ? "#e11d48" : "#94a3b8",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

function DiscoverPageInner() {
  const searchParams = useSearchParams();

  const [pincode, setPincode] = useState(searchParams.get("pincode") ?? "400050");
  const [radius, setRadius] = useState(Number(searchParams.get("radius") ?? 10));
  const [gender, setGender] = useState(searchParams.get("gender") ?? "all");
  const [subCategory, setSubCategory] = useState(searchParams.get("subCategory") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "distance");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [liveOnly, setLiveOnly] = useState(searchParams.get("liveOnly") === "true");

  const [stores, setStores] = useState<DiscoveredStore[]>([]);
  const [sortedProducts, setSortedProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Clicking a header link (category, Live Sales) or a saved Smart Sort
  // changes the URL but stays on this same route, so it doesn't remount the
  // component — sync local filter state whenever the query string changes.
  useEffect(() => {
    setPincode(searchParams.get("pincode") ?? "400050");
    setRadius(Number(searchParams.get("radius") ?? 10));
    setGender(searchParams.get("gender") ?? "all");
    setSubCategory(searchParams.get("subCategory") ?? "");
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
    setSize(searchParams.get("size") ?? "");
    setSortBy(searchParams.get("sort") ?? "distance");
    setQ(searchParams.get("q") ?? "");
    setLiveOnly(searchParams.get("liveOnly") === "true");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const storeParams = new URLSearchParams({ pincode, radius: String(radius), gender, liveOnly: String(liveOnly) });
    const productParams = new URLSearchParams({ pincode, radius: String(radius), gender, sort: sortBy, liveOnly: String(liveOnly) });
    if (subCategory) {
      storeParams.set("subCategory", subCategory);
      productParams.set("subCategory", subCategory);
    }
    if (minPrice) productParams.set("minPrice", minPrice);
    if (maxPrice) productParams.set("maxPrice", maxPrice);
    if (size) productParams.set("size", size);
    if (q) productParams.set("q", q);

    Promise.all([
      fetch(`/api/v1/discover?${storeParams}`).then((r) => r.json()),
      fetch(`/api/v1/products/search?${productParams}`).then((r) => r.json()),
    ])
      .then(([storeResults, productResults]) => {
        setStores(storeResults);
        setSortedProducts(productResults);
      })
      .finally(() => setLoading(false));
  }, [pincode, radius, gender, subCategory, minPrice, maxPrice, size, sortBy, q, liveOnly]);

  const activeSubCategories = CATEGORY_TREE.find((c) => c.value === gender)?.subCategories ?? [];

  function handleSaveSort() {
    if (!saveName.trim()) return;
    saveSmartSort(saveName.trim(), {
      pincode,
      radiusKm: radius,
      gender,
      subCategory: subCategory || undefined,
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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 40px" }}>
      <HeroSlider />

      {q && (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#475569" }}>
          Showing results for <strong>&ldquo;{q}&rdquo;</strong>
        </div>
      )}

      {liveOnly && (
        <div
          className="sio-fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "10px 14px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: 10,
            fontSize: 13,
            color: "#be123c",
          }}
        >
          <span className="sio-live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#e11d48", display: "inline-block" }} />
          Showing only stores &amp; products with a live sale right now.
          <button
            onClick={() => setLiveOnly(false)}
            style={{ marginLeft: "auto", border: "none", background: "none", color: "#be123c", textDecoration: "underline", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      )}

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

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setGender("all");
              setSubCategory("");
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #cbd5e1",
              background: gender === "all" ? "#0f172a" : "#fff",
              color: gender === "all" ? "#fff" : "#0f172a",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            All
          </button>
          {CATEGORY_TREE.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setGender(c.value);
                setSubCategory("");
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #cbd5e1",
                background: gender === c.value ? "#0f172a" : "#fff",
                color: gender === c.value ? "#fff" : "#0f172a",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {activeSubCategories.length > 0 && (
          <div className="sio-fade-in" style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%", marginTop: 4 }}>
            {activeSubCategories.map((sc) => (
              <button
                key={sc}
                onClick={() => setSubCategory(subCategory === sc ? "" : sc)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  background: subCategory === sc ? "#e0e7ff" : "#f8fafc",
                  color: subCategory === sc ? "#1e3a8a" : "#475569",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {sc}
              </button>
            ))}
          </div>
        )}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} height={110} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <p>No stores found matching these filters. Try widening the radius or clearing a filter.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          {stores.map((s, i) => (
            <Link
              key={s.id}
              href={`/store/${s.slug}`}
              className="sio-card sio-fade-in"
              style={{
                display: "block",
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{s.name}</h3>
                {s.hasLiveSale && (
                  <span style={{ background: "#e11d48", color: "#fff", fontSize: 11, padding: "3px 8px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="sio-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
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

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
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
          {savedMsg && (
            <span className="sio-fade-in" style={{ fontSize: 13, color: "#16a34a" }}>
              {savedMsg}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} height={260} />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <p style={{ color: "#64748b" }}>No products match this sort yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {sortedProducts.map((p, i) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="sio-card sio-fade-in"
                style={{
                  position: "relative",
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid #f1f5f9",
                  background: "#fff",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <div style={{ position: "relative" }}>
                  <img src={p.images?.[0]?.url} alt={p.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                  <HeartButton product={p} />
                </div>
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
        )}
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

"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ALL_SIZES, CATEGORY_TREE } from "../../lib/catalog-constants";
import { ProductCard } from "../../components/ProductCard";

interface Product {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  storeSlug: string;
  storeName: string;
  stockRemaining?: number;
}

const SORT_TABS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price -- Low to High" },
  { value: "price_desc", label: "Price -- High to Low" },
  { value: "newest", label: "Newest First" },
];

function SkeletonCard() {
  return <div className="sio-skeleton" style={{ borderRadius: 14, height: 260 }} />;
}


function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const [gender, setGender] = useState(searchParams.get("gender") ?? "all");
  const [subCategory, setSubCategory] = useState(searchParams.get("subCategory") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "relevance");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // A new search from the header changes only the URL's `q` (this component
  // stays mounted) - resync every filter from the query string so stale
  // filters from a previous search don't silently carry over.
  useEffect(() => {
    setGender(searchParams.get("gender") ?? "all");
    setSubCategory(searchParams.get("subCategory") ?? "");
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
    setSize(searchParams.get("size") ?? "");
    setSort(searchParams.get("sort") ?? "relevance");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (gender !== "all") params.set("gender", gender);
    if (subCategory) params.set("subCategory", subCategory);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (size) params.set("size", size);
    if (sort !== "relevance") params.set("sort", sort);

    fetch(`/api/v1/products/search?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [q, gender, subCategory, minPrice, maxPrice, size, sort]);

  function updateUrl(next: { gender?: string; subCategory?: string; minPrice?: string; maxPrice?: string; size?: string; sort?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { gender, subCategory, minPrice, maxPrice, size, sort, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "all" && value !== "relevance") params.set(key, value);
      else params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  }

  const activeSubCategories = CATEGORY_TREE.find((c) => c.value === gender)?.subCategories ?? [];

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "20px 16px 48px" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>
        <Link href="/" style={{ color: "#94a3b8" }}>
          Home
        </Link>{" "}
        / Search results
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        {loading ? "Searching…" : `Showing ${products.length} result${products.length === 1 ? "" : "s"} for `}
        {!loading && <span style={{ fontWeight: 800 }}>&ldquo;{q}&rdquo;</span>}
      </h1>

      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #e2e8f0",
          marginTop: 14,
          marginBottom: 24,
          flexWrap: "wrap",
          position: "sticky",
          top: 88,
          zIndex: 15,
          background: "#fff",
        }}
      >
        {SORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateUrl({ sort: tab.value })}
            style={{
              padding: "10px 16px",
              border: "none",
              borderBottom: sort === tab.value ? "2px solid #0f172a" : "2px solid transparent",
              background: "none",
              color: sort === tab.value ? "#0f172a" : "#64748b",
              fontWeight: sort === tab.value ? 700 : 500,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="sio-search-layout" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28, alignItems: "start" }}>
        <aside
          className="sio-card"
          style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #f1f5f9", position: "sticky", top: 88 }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Filters</div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#94a3b8", marginBottom: 8 }}>
              Category
            </div>
            {["all", "men", "women", "kids"].map((g) => (
              <label key={g} style={filterRowStyle}>
                <input
                  type="radio"
                  name="gender"
                  checked={gender === g}
                  onChange={() => updateUrl({ gender: g, subCategory: "" })}
                />
                {g === "all" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)}
              </label>
            ))}
          </div>

          {activeSubCategories.length > 0 && (
            <div className="sio-fade-in" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#94a3b8", marginBottom: 8 }}>
                Type
              </div>
              {activeSubCategories.map((sc) => (
                <label key={sc} style={filterRowStyle}>
                  <input type="checkbox" checked={subCategory === sc} onChange={() => updateUrl({ subCategory: subCategory === sc ? "" : sc })} />
                  {sc}
                </label>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#94a3b8", marginBottom: 8 }}>
              Price
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => updateUrl({ minPrice })}
                style={{ width: "50%", padding: "7px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => updateUrl({ maxPrice })}
                style={{ width: "50%", padding: "7px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "#94a3b8", marginBottom: 8 }}>
              Size
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => updateUrl({ size: size === sz ? "" : sz })}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: size === sz ? "1px solid #0f172a" : "1px solid #e2e8f0",
                    background: size === sz ? "#0f172a" : "#fff",
                    color: size === sz ? "#fff" : "#334155",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="sio-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No products found for &ldquo;{q}&rdquo;. Try a different search or{" "}
              <Link href="/shops" style={{ color: "#2563eb" }}>
                browse all shops
              </Link>{" "}
              instead.
            </p>
          ) : (
            <div className="sio-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const filterRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13.5,
  color: "#334155",
  padding: "5px 0",
  cursor: "pointer",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 1440, margin: "0 auto", padding: 16 }}>Loading…</main>}>
      <SearchPageInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CATEGORY_TREE } from "../../../lib/catalog-constants";
import { ProductCard } from "../../../components/ProductCard";

const SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(CATEGORY_TREE.map((c) => [c.value, c.subCategories]));

const GENDER_LABELS: Record<string, string> = { men: "Men", women: "Women", kids: "Kids" };

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

function SkeletonCard() {
  return <div className="sio-skeleton" style={{ borderRadius: 14, height: 260 }} />;
}


function CategoryPageInner() {
  const { gender } = useParams<{ gender: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subCategory = searchParams.get("subCategory") ?? "";
  const sort = searchParams.get("sort") ?? "newest";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const genderLabel = GENDER_LABELS[gender] ?? gender;
  const subCats = SUBCATEGORIES[gender] ?? [];

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ gender, sort });
    if (subCategory) params.set("subCategory", subCategory);
    fetch(`/api/v1/products/search?${params}`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gender, subCategory, sort]);

  function setQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/category/${gender}?${params.toString()}`);
  }

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
        <Link href="/" style={{ color: "#94a3b8" }}>
          Home
        </Link>{" "}
        / {genderLabel}
        {subCategory && ` / ${subCategory}`}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        {subCategory || genderLabel} {subCategory ? `· ${genderLabel}` : ""}
      </h1>

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
          marginBottom: 24,
          position: "sticky",
          top: 88,
          zIndex: 15,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setQuery("subCategory", "")} style={pillStyle(!subCategory)}>
            All {genderLabel}
          </button>
          {subCats.map((sc) => (
            <button key={sc} onClick={() => setQuery("subCategory", sc)} style={pillStyle(subCategory === sc)}>
              {sc}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setQuery("sort", e.target.value)} style={{ marginLeft: "auto", padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }}>
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </section>

      {loading ? (
        <div className="sio-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No products in {subCategory || genderLabel} yet.{" "}
          <Link href="/shops" style={{ color: "#2563eb" }}>
            Browse all shops
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
    </main>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 1440, margin: "0 auto", padding: 16 }}>Loading…</main>}>
      <CategoryPageInner />
    </Suspense>
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

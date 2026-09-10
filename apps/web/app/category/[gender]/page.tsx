"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { toggleWishlist, isWishlisted } from "../../../lib/wishlist";
import { CATEGORY_TREE } from "../../../lib/catalog-constants";
import { ProductCardInfo } from "../../../components/ProductCardInfo";

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

function DiscountBadge({ basePrice, compareAtPrice }: { basePrice: number; compareAtPrice?: number }) {
  if (!compareAtPrice || compareAtPrice <= basePrice) return null;
  const pct = Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100);
  return (
    <span style={{ position: "absolute", top: 8, left: 8, background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>
      {pct}% OFF
    </span>
  );
}

function HeartButton({ product }: { product: Product }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isWishlisted(product.id)), [product.id]);

  return (
    <button
      className="sio-heart-btn"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn(
          toggleWishlist({
            productId: product.id,
            title: product.title,
            storeSlug: product.storeSlug,
            storeName: product.storeName,
            price: product.basePrice,
            imageUrl: product.images?.[0]?.url ?? "",
          })
        );
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
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 2px 6px rgba(15,23,42,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: on ? "#e11d48" : "#94a3b8",
      }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
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
      .finally(() => setLoading(false));
  }, [gender, subCategory, sort]);

  function setQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/category/${gender}?${params.toString()}`);
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 48px" }}>
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
        style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", background: "#fff", padding: 16, borderRadius: 16, border: "1px solid #f1f5f9", marginBottom: 24 }}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {products.map((p, i) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="sio-card sio-fade-in"
              style={{ position: "relative", textDecoration: "none", color: "inherit", borderRadius: 14, overflow: "hidden", border: "1px solid #f1f5f9", background: "#fff", animationDelay: `${i * 40}ms` }}
            >
              <div style={{ position: "relative" }}>
                <img src={p.images?.[0]?.url} alt={p.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                <DiscountBadge basePrice={p.basePrice} compareAtPrice={p.compareAtPrice} />
                <HeartButton product={p} />
              </div>
              <ProductCardInfo title={p.title} storeName={p.storeName} basePrice={p.basePrice} compareAtPrice={p.compareAtPrice} stockRemaining={p.stockRemaining} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>Loading…</main>}>
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

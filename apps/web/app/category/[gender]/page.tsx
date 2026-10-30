"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CATEGORY_TREE } from "../../../lib/catalog-constants";
import { ProductCard } from "../../../components/ProductCard";
import { ExploreOnMapButton } from "../../../components/ExploreOnMapButton";
import { LoadingScreen } from "../../../components/LoadingSpinner";
import { CategoryFilterSidebar, ProductFacets } from "../../../components/CategoryFilterSidebar";

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

function csv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function CategoryPageInner() {
  const { gender } = useParams<{ gender: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  // subCategories accepts either the new plural ?subCategories=A,B or the
  // older singular ?subCategory=A (still linked to from the homepage's
  // category tiles) - read once on first render so a link like that still
  // lands pre-filtered instead of showing everything.
  const subCategories = searchParams.get("subCategories") != null ? csv(searchParams.get("subCategories")) : csv(searchParams.get("subCategory"));
  const storeIds = csv(searchParams.get("storeIds"));
  const colors = csv(searchParams.get("colors"));
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const priceRange: [number, number] | null = minPriceParam && maxPriceParam ? [Number(minPriceParam), Number(maxPriceParam)] : null;
  const minDiscountParam = searchParams.get("minDiscount");
  const minDiscount = minDiscountParam ? Number(minDiscountParam) : undefined;
  const sort = searchParams.get("sort") ?? "newest";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<ProductFacets | null>(null);

  const genderLabel = GENDER_LABELS[gender] ?? gender;
  const subCats = SUBCATEGORIES[gender] ?? [];

  const filterKey = JSON.stringify({ gender, subCategories, storeIds, colors, priceRange, minDiscount, sort });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ gender, sort });
    if (subCategories.length) params.set("subCategories", subCategories.join(","));
    if (storeIds.length) params.set("storeIds", storeIds.join(","));
    if (colors.length) params.set("colors", colors.join(","));
    if (priceRange) {
      params.set("minPrice", String(priceRange[0]));
      params.set("maxPrice", String(priceRange[1]));
    }
    if (minDiscount != null) params.set("minDiscount", String(minDiscount));
    fetch(`/api/v1/products/search?${params}`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterKey]);

  // Facets are fetched separately from the product list itself (not derived
  // from `products` client-side) because each facet group's count needs
  // every OTHER active filter applied but excludes its own selection - see
  // getProductFacets in lib/seed-data.ts. Same dependency list as the
  // product fetch above, since any filter change can shift every count.
  useEffect(() => {
    const params = new URLSearchParams({ gender });
    if (subCategories.length) params.set("subCategories", subCategories.join(","));
    if (storeIds.length) params.set("storeIds", storeIds.join(","));
    if (colors.length) params.set("colors", colors.join(","));
    if (priceRange) {
      params.set("minPrice", String(priceRange[0]));
      params.set("maxPrice", String(priceRange[1]));
    }
    if (minDiscount != null) params.set("minDiscount", String(minDiscount));
    fetch(`/api/v1/products/facets?${params}`)
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => {});
  }, [filterKey]);

  // Merges one or more query-param changes into a single navigation instead
  // of each filter handler doing its own router.push - a sidebar checkbox
  // only ever needs to touch its own key, but this is shared so every
  // handler (mobile pills included) stays a one-liner.
  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/category/${gender}?${params.toString()}`);
  }

  function setMobileSubCategory(sc: string) {
    // The mobile pill row is single-pick (same feel as before this
    // sidebar existed) - selecting a pill replaces the whole set rather
    // than toggling into it. Clears the legacy singular param too so a
    // stale ?subCategory= from a shared link never fights the new one.
    updateParams({ subCategories: sc ? sc : undefined, subCategory: undefined });
  }

  function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function toggleSubCategory(sc: string) {
    updateParams({ subCategories: toggleInList(subCategories, sc).join(",") || undefined, subCategory: undefined });
  }
  function toggleStore(id: string) {
    updateParams({ storeIds: toggleInList(storeIds, id).join(",") || undefined });
  }
  function toggleColor(c: string) {
    updateParams({ colors: toggleInList(colors, c).join(",") || undefined });
  }
  function setPriceRange(range: [number, number] | null) {
    updateParams({ minPrice: range ? String(range[0]) : undefined, maxPrice: range ? String(range[1]) : undefined });
  }
  function setMinDiscount(value: number | undefined) {
    updateParams({ minDiscount: value != null ? String(value) : undefined });
  }
  function setSort(value: string) {
    updateParams({ sort: value });
  }

  const headingSuffix = subCategories.length === 1 ? subCategories[0] : subCategories.length > 1 ? `${subCategories.length} categories` : "";

  // An unrecognized gender segment (a mistyped or stale shared link, e.g.
  // /category/xyz) used to fall through silently - genderLabel became the
  // raw "xyz", subCats stayed an empty array, and the page rendered a
  // confusing blank "xyz" heading with no products and no filters rather
  // than telling the visitor the page doesn't exist. Checked after every
  // hook above (not before), same reasoning as this file's own `use client`
  // sibling pages that do the same (e.g. the product page's own notFound
  // state) - Hooks must run unconditionally on every render.
  if (!(gender in GENDER_LABELS)) {
    return (
      <main style={{ maxWidth: 600, margin: "80px auto", padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>This category doesn't exist.</p>
        <Link href="/" style={{ color: "var(--sio-ink)", fontWeight: 600 }}>
          Back to Home
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div style={{ fontSize: 13, color: "var(--sio-muted)", marginBottom: 8 }}>
        <Link href="/" style={{ color: "var(--sio-muted)" }}>
          Home
        </Link>{" "}
        / {genderLabel}
        {headingSuffix && ` / ${headingSuffix}`}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        {headingSuffix || genderLabel} {headingSuffix ? `· ${genderLabel}` : ""}
      </h1>

      {/* Mobile (<=760px): the original horizontal pill row, unchanged. */}
      <section
        className="sio-card sio-listing-mobile-filters"
        style={{
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          background: "#fff",
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--sio-cream)",
          marginBottom: 24,
          position: "sticky",
          top: 88,
          zIndex: 15,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setMobileSubCategory("")} style={pillStyle(subCategories.length === 0)}>
            All {genderLabel}
          </button>
          {subCats.map((sc) => (
            <button key={sc} onClick={() => setMobileSubCategory(sc)} style={pillStyle(subCategories.length === 1 && subCategories[0] === sc)}>
              {sc}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
          {!loading && <ExploreOnMapButton products={products} />}
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 13 }}>
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </section>

      {/* Desktop (>=761px): left filter sidebar + a fixed 4-column grid,
          matching the standard marketplace listing layout (see
          .sio-listing-* in globals.css). Facets (counts per option, price
          bounds) come from a dedicated endpoint - see the facets effect
          above. */}
      <div className="sio-listing-layout">
        <aside className="sio-listing-sidebar">
          <CategoryFilterSidebar
            genderLabel={genderLabel}
            facets={facets}
            selectedSubCategories={subCategories}
            onToggleSubCategory={toggleSubCategory}
            selectedStoreIds={storeIds}
            onToggleStore={toggleStore}
            selectedColors={colors}
            onToggleColor={toggleColor}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            minDiscount={minDiscount}
            onMinDiscountChange={setMinDiscount}
          />
        </aside>

        <div className="sio-listing-main">
          <div className="sio-listing-main-topbar" style={{ justifyContent: "flex-end", gap: 10, alignItems: "center", marginBottom: 16 }}>
            {!loading && <ExploreOnMapButton products={products} />}
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 13 }}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {loading ? (
            <div className="sio-listing-grid">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p style={{ color: "var(--sio-muted)" }}>
              No products match these filters yet.{" "}
              <Link href="/shops" style={{ color: "var(--sio-ink)" }}>
                Browse all shops
              </Link>{" "}
              instead.
            </p>
          ) : (
            <div className="sio-listing-grid">
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

export default function CategoryPage() {
  return (
    <Suspense fallback={<LoadingScreen maxWidth={1440} />}>
      <CategoryPageInner />
    </Suspense>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    border: active ? "1px solid var(--sio-ink)" : "1px solid var(--sio-line)",
    background: active ? "var(--sio-ink)" : "#fff",
    color: active ? "#fff" : "var(--sio-ink)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  };
}

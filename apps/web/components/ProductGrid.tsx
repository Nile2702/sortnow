import { ProductCard } from "./ProductCard";
import { products as allProducts, stores } from "../lib/seed-data";

interface Props {
  storeId: string;
  gridStyle: "2-col" | "3-col" | "4-col" | "list";
  title: string;
  categoryId?: string;
  sort?: string;
  limit?: number;
}

// minmax(0, 1fr) rather than plain 1fr: a bare 1fr track has an implicit
// min-width of auto (its content's min-content size), so an unbreakable
// price line or title inside one card can force the whole grid wider than
// its container - the classic CSS Grid overflow gotcha, and exactly what
// was pushing this grid ~20px past the viewport on narrow phones.
const COLUMNS: Record<Props["gridStyle"], string> = {
  "2-col": "repeat(2, minmax(0, 1fr))",
  "3-col": "repeat(3, minmax(0, 1fr))",
  "4-col": "repeat(4, minmax(0, 1fr))",
  list: "1fr",
};

// Reads straight from the in-process product list instead of making an HTTP
// round-trip to this app's own API route - see lib/theme.ts for why a
// server component self-fetching its own deployment is a trap on Vercel
// (INTERNAL_API_URL is dev-only, and even a VERCEL_URL-based absolute URL
// fetch can come back wrong depending on deployment protection).
async function fetchProducts(storeId: string, opts: { categoryId?: string; sort?: string; limit?: number }) {
  const store = stores.find((s) => s.id === storeId || s.slug === storeId);
  if (!store) return [];

  let list = allProducts.filter((p) => p.storeId === store.id);
  if (opts.categoryId) list = list.filter((p) => p.categoryId === opts.categoryId);
  if (opts.sort === "newest") list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (opts.sort === "price_asc") list = [...list].sort((a, b) => a.basePrice - b.basePrice);
  if (opts.sort === "price_desc") list = [...list].sort((a, b) => b.basePrice - a.basePrice);

  // Public, shopper-facing grid - costPrice (the seller's own purchase
  // cost) must never leave the seller dashboard, see Product.costPrice.
  return list.slice(0, opts.limit ?? 8).map(({ costPrice: _costPrice, ...p }) => p);
}

// Same card design as every other shopper-facing grid on the site (see
// components/ProductCard.tsx) - full-bleed photo, dark gradient, bold white
// overlay text - so a store's own catalog looks like part of the same site
// rather than a differently-styled one.
export async function ProductGrid({ storeId, gridStyle, title, categoryId, sort, limit }: Props) {
  const products = await fetchProducts(storeId, { categoryId, sort, limit });
  if (!products.length) return null;

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 16px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{title}</h2>
      <div className={gridStyle === "list" ? undefined : "sio-product-grid"} style={{ display: "grid", gridTemplateColumns: COLUMNS[gridStyle], gap: 16 }}>
        {products.map((p: any, i: number) => (
          <ProductCard key={p.id} product={p} index={i} showStore={false} />
        ))}
      </div>
    </div>
  );
}

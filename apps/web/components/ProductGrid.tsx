import { ProductCard } from "./ProductCard";

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

async function fetchProducts(storeId: string, opts: { categoryId?: string; sort?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (opts.categoryId) params.set("category", opts.categoryId);
  if (opts.sort) params.set("sort", opts.sort);
  params.set("limit", String(opts.limit ?? 8));

  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/stores/${storeId}/products?${params}`, {
    next: { revalidate: 60, tags: [`products:${storeId}`] },
  });
  if (!res.ok) return [];
  return res.json();
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

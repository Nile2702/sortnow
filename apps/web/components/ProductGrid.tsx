import { TiltCard } from "./TiltCard";

interface Props {
  storeId: string;
  gridStyle: "2-col" | "3-col" | "4-col" | "list";
  title: string;
  categoryId?: string;
  sort?: string;
  limit?: number;
}

const COLUMNS: Record<Props["gridStyle"], string> = {
  "2-col": "repeat(2, 1fr)",
  "3-col": "repeat(3, 1fr)",
  "4-col": "repeat(4, 1fr)",
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

// Same card design as the homepage's "Shop in Sort" grid - white card, 14px
// radius, subtle border/shadow, sio-card hover lift - so a store's catalog
// looks like part of the same site rather than a differently-styled one.
export async function ProductGrid({ storeId, gridStyle, title, categoryId, sort, limit }: Props) {
  const products = await fetchProducts(storeId, { categoryId, sort, limit });
  if (!products.length) return null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: COLUMNS[gridStyle], gap: 16 }}>
        {products.map((p: any, i: number) => (
          <div key={p.id} className="sio-reveal" style={{ animationDelay: `${i * 60}ms` }}>
            <TiltCard>
              <a
                href={`/product/${p.id}`}
                className="sio-card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid #f1f5f9",
                  background: "#fff",
                }}
              >
                <img src={p.images?.[0]?.url} alt={p.title} loading="lazy" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 700 }}>₹{p.basePrice}</span>
                    {p.compareAtPrice && (
                      <span style={{ textDecoration: "line-through", marginLeft: 6, opacity: 0.55, fontSize: 12 }}>₹{p.compareAtPrice}</span>
                    )}
                  </div>
                  {p.stockRemaining != null && p.stockRemaining <= 5 && (
                    <div style={{ fontSize: 12, color: "#e11d48", marginTop: 4 }}>Only {p.stockRemaining} left</div>
                  )}
                </div>
              </a>
            </TiltCard>
          </div>
        ))}
      </div>
    </div>
  );
}

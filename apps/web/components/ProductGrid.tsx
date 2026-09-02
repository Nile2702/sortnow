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
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function ProductGrid({ storeId, gridStyle, title, categoryId, sort, limit }: Props) {
  const products = await fetchProducts(storeId, { categoryId, sort, limit });
  if (!products.length) return null;

  return (
    <div style={{ padding: "24px 16px" }}>
      <h2 style={{ fontFamily: "var(--sio-font-heading)", marginBottom: 16 }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: COLUMNS[gridStyle], gap: 16 }}>
        {products.map((p: any) => (
          <a
            key={p.id}
            href={`/store/${p.storeSlug}/product/${p.id}`}
            style={{ textDecoration: "none", color: "inherit", borderRadius: "var(--sio-radius)", overflow: "hidden" }}
          >
            <img src={p.images?.[0]?.url} alt={p.title} loading="lazy" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 14 }}>{p.title}</div>
              <div style={{ fontWeight: 600 }}>
                ₹{p.basePrice}
                {p.compareAtPrice && (
                  <span style={{ textDecoration: "line-through", marginLeft: 6, opacity: 0.6, fontWeight: 400 }}>
                    ₹{p.compareAtPrice}
                  </span>
                )}
              </div>
              {p.stockRemaining != null && p.stockRemaining <= 5 && (
                <div style={{ fontSize: 12, color: "var(--sio-color-sale-badge)" }}>Only {p.stockRemaining} left</div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

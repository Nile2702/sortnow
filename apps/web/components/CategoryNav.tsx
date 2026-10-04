import { categories, stores } from "../lib/seed-data";

// Reads straight from the in-process category map instead of making an HTTP
// round-trip to this app's own API route - see lib/theme.ts for why a
// server component self-fetching its own deployment is a trap on Vercel.
async function fetchCategories(storeId: string) {
  const store = stores.find((s) => s.id === storeId || s.slug === storeId);
  if (!store) return [];
  return categories[store.id] ?? [];
}

// Pill style matches the homepage's subcategory chips - only the hover/active
// tint comes from the store's own accent color (--store-accent).
export async function CategoryNav({ storeId }: { storeId: string }) {
  const categories = await fetchCategories(storeId);
  if (!categories.length) return null;

  return (
    <nav style={{ maxWidth: 1440, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto", padding: "16px" }}>
      {categories.map((c: any) => (
        <a
          key={c.id}
          href={`?category=${c.id}`}
          className="sio-category-pill"
          style={{
            whiteSpace: "nowrap",
            textDecoration: "none",
            color: "#334155",
            background: "#f1f5f9",
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {c.name}
        </a>
      ))}
    </nav>
  );
}

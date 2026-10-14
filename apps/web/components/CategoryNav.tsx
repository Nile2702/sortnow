import { getAllCategories, getAllStores } from "../lib/seed-data";

// Reads straight from the database instead of making an HTTP round-trip to
// this app's own API route - see lib/theme.ts for why a server component
// self-fetching its own deployment is a trap on Vercel.
async function fetchCategories(storeId: string) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === storeId || s.slug === storeId);
  // Defense in depth, same reasoning as ProductGrid.tsx - the only page that
  // renders this (app/store/[slug]/page.tsx) already 404s for a non-active
  // store first, but this component shouldn't rely on that alone.
  if (!store || store.status !== "active") return [];
  const categories = await getAllCategories();
  return categories[store.id] ?? [];
}

// Pill style matches the homepage's subcategory chips - only the hover/active
// tint comes from the store's own accent color (--store-accent).
export async function CategoryNav({ storeId, activeCategoryId }: { storeId: string; activeCategoryId?: string }) {
  const categories = await fetchCategories(storeId);
  if (!categories.length) return null;

  return (
    <nav style={{ maxWidth: 1440, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto", padding: "16px" }}>
      {categories.map((c: any) => {
        const active = c.id === activeCategoryId;
        // Tapping the already-active pill clears the filter instead of being
        // a dead end - the only way back to the full catalog would otherwise
        // be re-navigating to the store page from scratch.
        return (
          <a
            key={c.id}
            href={active ? "?" : `?category=${c.id}`}
            className="sio-category-pill"
            style={{
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: active ? "#fff" : "#334155",
              background: active ? "var(--store-accent, #1f2937)" : "#f1f5f9",
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {c.name}
          </a>
        );
      })}
    </nav>
  );
}

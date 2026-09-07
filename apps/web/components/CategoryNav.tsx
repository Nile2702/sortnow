async function fetchCategories(storeId: string) {
  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/stores/${storeId}/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  return res.json();
}

// Pill style matches the homepage's subcategory chips - only the hover/active
// tint comes from the store's own accent color (--store-accent).
export async function CategoryNav({ storeId }: { storeId: string }) {
  const categories = await fetchCategories(storeId);
  if (!categories.length) return null;

  return (
    <nav style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto", padding: "16px" }}>
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

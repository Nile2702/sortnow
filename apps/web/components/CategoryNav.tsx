async function fetchCategories(storeId: string) {
  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/stores/${storeId}/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function CategoryNav({ storeId }: { storeId: string }) {
  const categories = await fetchCategories(storeId);
  if (!categories.length) return null;

  return (
    <nav style={{ display: "flex", gap: 16, overflowX: "auto", padding: "12px 16px", fontFamily: "var(--sio-font-body)" }}>
      {categories.map((c: any) => (
        <a key={c.id} href={`?category=${c.id}`} style={{ whiteSpace: "nowrap", color: "var(--sio-color-primary)", textDecoration: "none" }}>
          {c.name}
        </a>
      ))}
    </nav>
  );
}

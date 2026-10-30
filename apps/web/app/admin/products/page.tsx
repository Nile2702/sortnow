import { getAllProducts, getAllStores } from "../../../lib/seed-data";

// Pilot-only individual-listing moderation tool - the narrower alternative
// to /admin/sellers/active (which holds/reinstates an entire seller) for
// when only one product is the problem. Reached as
// /admin/products?key=<ADMIN_SECRET> - same shared-secret gate as the rest
// of /admin/** (see lib/admin-auth.ts, middleware.ts). No client JS: the
// search box and status filter are a plain GET <form> (reloads this page
// with ?q=&status=), same philosophy as the Hold/Unhold buttons below being
// plain POST <form>s - a pilot tool for one person doesn't need a SPA.
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { key?: string; q?: string; status?: string };
}) {
  const key = searchParams.key ?? "";
  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status === "live" || searchParams.status === "on_hold" ? searchParams.status : "all";

  const [products, stores] = await Promise.all([getAllProducts(), getAllStores()]);
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const queryLower = q.toLowerCase();
  const filtered = products.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!queryLower) return true;
    const store = storeById.get(p.storeId);
    return (
      p.title.toLowerCase().includes(queryLower) ||
      (p.productCode ?? "").toLowerCase().includes(queryLower) ||
      (store?.name ?? "").toLowerCase().includes(queryLower)
    );
  });

  const heldCount = products.filter((p) => p.status === "on_hold").length;

  // Carries the current q/status filters through to the Hold/Unhold form
  // actions below (see app/api/v1/admin/products/[productId]/hold|unhold)
  // so submitting one doesn't reset the admin's current search/filter view.
  const filterQS = `${q ? `&q=${encodeURIComponent(q)}` : ""}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Product moderation</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 20, fontSize: 14 }}>
        {products.length} listing{products.length === 1 ? "" : "s"} across every store
        {heldCount > 0 ? ` &middot; ${heldCount} currently on hold` : ""}. Holding a listing hides it from shoppers (search, its store page,
        reservations) immediately, while the seller still sees it (marked &ldquo;On hold&rdquo;) in their own dashboard.
      </p>

      <form
        method="get"
        action="/admin/products"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, background: "#fff", border: "1px solid var(--sio-cream)", borderRadius: 16, padding: 16 }}
      >
        <input type="hidden" name="key" value={key} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by title, product code, or store name…"
          style={{ flex: "1 1 260px", padding: "9px 14px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 13 }}
        />
        <select name="status" defaultValue={statusFilter} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 13 }}>
          <option value="all">All statuses</option>
          <option value="live">Live only</option>
          <option value="on_hold">On hold only</option>
        </select>
        <button
          type="submit"
          style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>No products match this filter.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p) => {
            const store = storeById.get(p.storeId);
            const isHeld = p.status === "on_hold";
            return (
              <div
                key={p.id}
                className="sio-card"
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: isHeld ? "var(--sio-pending-bg)" : "#fff",
                  border: `1px solid ${isHeld ? "var(--sio-pending-border)" : "var(--sio-cream)"}`,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <img
                  src={p.images?.[0]?.url}
                  alt={p.title}
                  style={{ width: 52, height: 66, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                />
                <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    {p.title}
                    {isHeld && (
                      <span
                        style={{ fontSize: 11, fontWeight: 700, color: "var(--sio-pending)", background: "var(--sio-pending-bg)", border: "1px solid var(--sio-pending-border)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.03em" }}
                      >
                        On hold
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>
                    {store?.name ?? "unknown store"} &middot; {p.gender} &middot; {p.subCategory}
                    {p.productCode ? ` · ${p.productCode}` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700, minWidth: 70, textAlign: "right" }}>₹{p.basePrice.toLocaleString("en-IN")}</div>
                <form
                  action={`/api/v1/admin/products/${p.id}/${isHeld ? "unhold" : "hold"}?key=${encodeURIComponent(key)}&redirect=1${filterQS}`}
                  method="post"
                >
                  <button
                    type="submit"
                    style={
                      isHeld
                        ? { padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }
                        : { padding: "8px 16px", borderRadius: 10, border: "1px solid var(--sio-error-border)", background: "#fff", color: "var(--sio-error)", fontWeight: 600, fontSize: 13, cursor: "pointer" }
                    }
                  >
                    {isHeld ? "Unhold" : "Hold"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

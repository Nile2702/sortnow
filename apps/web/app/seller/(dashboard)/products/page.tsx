"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { LoadingScreen } from "../../../../components/LoadingSpinner";
import { showToast } from "../../../../lib/toast";
import { SparkleIcon } from "../../../../components/icons";

const LOW_STOCK_THRESHOLD = 5;

interface Product {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  costPrice?: number;
  images: { url: string }[];
  sizes: string[];
  stockRemaining?: number;
  gender: string;
  subCategory: string;
  color?: string;
  productCode?: string;
  // Set by the site owner's moderation tool (app/admin/products), never by
  // the seller themselves - a "live" listing is a normal one; "on_hold" is
  // hidden from shoppers everywhere (search, store page, reservations) but
  // still shown here, with the badge below, so the seller knows it was
  // pulled down rather than it just silently vanishing from their catalog.
  status?: "live" | "on_hold";
}

function SellerProductsPageInner() {
  const searchParams = useSearchParams();
  const { store, loading: storeLoading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  // Lets the dashboard's "Low Stock Alerts" tile deep-link straight into
  // this filter already applied, instead of landing here and making the
  // seller find and click it themselves.
  const [lowStockOnly, setLowStockOnly] = useState(() => searchParams.get("lowStock") === "1");
  // Per-row draft value while a seller is typing a new stock count - kept
  // separate from `products` so the input doesn't fight their typing before
  // the PATCH round-trip completes, and so a value they haven't committed
  // yet (still focused, no blur/Enter) doesn't get overwritten by a reload.
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  const lowStockCount = products.filter((p) => p.stockRemaining != null && p.stockRemaining <= LOW_STOCK_THRESHOLD).length;
  const inventoryValue = products.reduce((sum, p) => sum + (p.costPrice ?? 0) * (p.stockRemaining ?? 0), 0);
  const inventoryUnits = products.reduce((sum, p) => sum + (p.stockRemaining ?? 0), 0);

  const filteredProducts = products
    .filter((p) => !lowStockOnly || (p.stockRemaining != null && p.stockRemaining <= LOW_STOCK_THRESHOLD))
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.productCode ?? "").toLowerCase().includes(q);
    });

  async function handleStockCommit(id: string, rawValue: string) {
    const value = Number(rawValue);
    const product = products.find((p) => p.id === id);
    if (!product || !Number.isFinite(value) || value < 0 || value === product.stockRemaining) {
      setStockDrafts((d) => {
        const { [id]: _omit, ...rest } = d;
        return rest;
      });
      return;
    }
    setSavingStockId(id);
    try {
      const res = await fetch(`/api/v1/seller/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockRemaining: Math.floor(value) }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stockRemaining: updated.stockRemaining } : p)));
      } else {
        // Previously silent - a rejected stock edit (e.g. a session that
        // expired mid-edit) looked identical to a successful one, since the
        // draft was cleared either way with nothing shown.
        const result = await res.json().catch(() => null);
        showToast(result?.message ?? "Couldn't update stock. Try again.", "error");
      }
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    }
    setStockDrafts((d) => {
      const { [id]: _omit, ...rest } = d;
      return rest;
    });
    setSavingStockId(null);
  }

  function load(storeId: string) {
    setLoading(true);
    setLoadError(false);
    fetch(`/api/v1/seller/stores/${storeId}/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setProducts)
      // Silently swallowing this previously left the page stuck showing an
      // empty catalog with no indication the load had actually failed.
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (store) load(store.id);
  }, [store]);

  // Was previously gated behind window.confirm(), which some browser
  // contexts (embedded webviews, iframes, certain browser policies)
  // suppress outright - confirm() then always returns false and the delete
  // silently never happens, with no error or feedback shown. An inline
  // two-step confirmation in the page itself doesn't depend on native
  // dialog support at all.
  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/v1/seller/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Couldn't delete this product. Try again.");
        return;
      }
      if (store) load(store.id);
    } catch {
      setDeleteError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  if (storeLoading || !store) {
    return <LoadingScreen maxWidth={1440} />;
  }

  if (loadError) {
    return (
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load your products.</p>
        <button
          onClick={() => load(store.id)}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Products</h1>
          <p style={{ color: "var(--sio-muted)", fontSize: 14 }}>{store.name} · {products.length} SKUs</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/seller/products/bulk"
            style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid var(--sio-line)", color: "var(--sio-ink)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
          >
            Bulk Upload (CSV)
          </Link>
          <Link
            href="/seller/products/bulk-photos"
            style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid var(--sio-ai-accent-border)", background: "var(--sio-ai-accent-bg)", color: "var(--sio-ai-accent)", textDecoration: "none", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <SparkleIcon size={15} /> AI Bulk Upload
          </Link>
          <Link
            href="/seller/products/new"
            style={{ padding: "10px 20px", borderRadius: 999, background: "var(--sio-ink)", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
          >
            + Add Product
          </Link>
        </div>
      </div>

      {products.some((p) => p.status === "on_hold") && (
        <div
          style={{ background: "var(--sio-pending-bg)", border: "1px solid var(--sio-pending-border)", color: "var(--sio-pending)", borderRadius: 12, padding: "10px 16px", fontSize: 13, marginBottom: 16 }}
        >
          One or more of your listings below are marked <strong>On hold</strong> - SORT NOW has temporarily hidden them from shoppers (search, your store page,
          and reservations). Everything else in your catalog is unaffected. Contact support if you think this was a mistake.
        </div>
      )}

      {products.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ background: "#fff", border: "1px solid var(--sio-cream)", borderRadius: 12, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--sio-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Units in stock</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{inventoryUnits}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--sio-cream)", borderRadius: 12, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--sio-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Inventory value</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {inventoryValue > 0 ? `₹${inventoryValue.toLocaleString("en-IN")}` : "—"}
              </div>
              {inventoryValue === 0 && <div style={{ fontSize: 10, color: "var(--sio-muted)" }}>Set cost price on products to see this</div>}
            </div>
            <button
              type="button"
              onClick={() => setLowStockOnly((v) => !v)}
              style={{
                background: lowStockOnly ? "var(--sio-error-bg)" : "#fff",
                border: `1px solid ${lowStockOnly ? "var(--sio-error-border)" : "var(--sio-cream)"}`,
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 11, color: lowStockOnly ? "var(--sio-error)" : "var(--sio-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Low stock (≤{LOW_STOCK_THRESHOLD})
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: lowStockOnly ? "var(--sio-error)" : "var(--sio-ink)" }}>
                {lowStockCount} {lowStockOnly ? "· showing" : "· tap to filter"}
              </div>
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or product code…"
            style={{ width: "100%", maxWidth: 360, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--sio-line)", fontSize: 13, marginBottom: 16 }}
          />
        </>
      )}

      {loading ? (
        <p style={{ color: "var(--sio-muted)" }}>Loading products…</p>
      ) : products.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>No products yet. Add your first one to go live.</p>
      ) : filteredProducts.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>
          {lowStockOnly && !search.trim() ? "No products are low on stock right now." : `No products match "${search}".`}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="sio-card"
              style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "#fff", borderRadius: 14, border: "1px solid var(--sio-cream)", padding: 14 }}
            >
              <img src={p.images?.[0]?.url} alt={p.title} style={{ width: 56, height: 70, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  {p.title}
                  {p.status === "on_hold" && (
                    <span
                      title="Hidden from shoppers by SORT NOW - this listing was put on hold. Contact support if you think this is a mistake."
                      style={{ fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "var(--sio-pending)", background: "var(--sio-pending-bg)", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.03em" }}
                    >
                      On hold
                    </span>
                  )}
                  {p.productCode && (
                    <span
                      style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "var(--sio-ink)", background: "var(--sio-cream)", padding: "2px 6px", borderRadius: 4 }}
                    >
                      {p.productCode}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>
                  {p.gender} · {p.subCategory}
                  {p.color ? ` · ${p.color}` : ""} · {p.sizes.join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 110, flexShrink: 0 }}>
                <div style={{ fontWeight: 700 }}>₹{p.basePrice.toLocaleString("en-IN")}</div>
                {p.stockRemaining != null && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
                    <input
                      type="number"
                      min={0}
                      value={stockDrafts[p.id] ?? p.stockRemaining}
                      onChange={(e) => setStockDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      onBlur={(e) => handleStockCommit(p.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      disabled={savingStockId === p.id}
                      title="Click to adjust stock"
                      style={{
                        width: 52,
                        padding: "3px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--sio-line)",
                        fontSize: 12,
                        textAlign: "right",
                        color: p.stockRemaining <= LOW_STOCK_THRESHOLD ? "var(--sio-error)" : "var(--sio-ink)",
                      }}
                    />
                    <span style={{ fontSize: 12, color: p.stockRemaining <= LOW_STOCK_THRESHOLD ? "var(--sio-error)" : "var(--sio-muted)" }}>
                      {savingStockId === p.id ? "saving…" : "in stock"}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`/seller/products/${p.id}`}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--sio-line)", color: "var(--sio-ink)", textDecoration: "none", fontSize: 13 }}
                  >
                    Edit
                  </Link>
                  {confirmingId === p.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          border: "none",
                          background: deletingId === p.id ? "var(--sio-error-border)" : "var(--sio-error)",
                          color: "#fff",
                          cursor: deletingId === p.id ? "default" : "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {deletingId === p.id ? "Deleting…" : "Confirm Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={deletingId === p.id}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--sio-line)", background: "#fff", color: "var(--sio-ink)", cursor: "pointer", fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmingId(p.id);
                        setDeleteError("");
                      }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--sio-error-border)", background: "#fff", color: "var(--sio-error)", cursor: "pointer", fontSize: 13 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                {confirmingId === p.id && (
                  <span style={{ fontSize: 11, color: "var(--sio-error)" }}>This can&rsquo;t be undone.</span>
                )}
                {deleteError && confirmingId === null && deletingId === null && (
                  <span style={{ fontSize: 11, color: "var(--sio-error)" }}>{deleteError}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function SellerProductsPage() {
  return (
    <Suspense fallback={<LoadingScreen maxWidth={1440} />}>
      <SellerProductsPageInner />
    </Suspense>
  );
}

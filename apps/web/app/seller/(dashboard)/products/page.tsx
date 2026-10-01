"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../../lib/use-seller-store";

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
}

export default function SellerProductsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
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
    const res = await fetch(`/api/v1/seller/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockRemaining: Math.floor(value) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stockRemaining: updated.stockRemaining } : p)));
    }
    setStockDrafts((d) => {
      const { [id]: _omit, ...rest } = d;
      return rest;
    });
    setSavingStockId(null);
  }

  function load(storeId: string) {
    setLoading(true);
    fetch(`/api/v1/seller/stores/${storeId}/products`)
      .then((r) => r.json())
      .then(setProducts)
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
    const res = await fetch(`/api/v1/seller/products/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmingId(null);
    if (!res.ok) {
      setDeleteError("Couldn't delete this product. Try again.");
      return;
    }
    if (store) load(store.id);
  }

  if (storeLoading || !store) {
    return <main style={{ maxWidth: 1440, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Products</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{store.name} · {products.length} SKUs</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/seller/products/bulk"
            style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
          >
            Bulk Upload (CSV)
          </Link>
          <Link
            href="/seller/products/bulk-photos"
            style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid #e9d5ff", background: "#faf5ff", color: "#7c3aed", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
          >
            ✨ AI Bulk Upload
          </Link>
          <Link
            href="/seller/products/new"
            style={{ padding: "10px 20px", borderRadius: 999, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
          >
            + Add Product
          </Link>
        </div>
      </div>

      {products.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Units in stock</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{inventoryUnits}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "10px 16px" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Inventory value</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {inventoryValue > 0 ? `₹${inventoryValue.toLocaleString("en-IN")}` : "—"}
              </div>
              {inventoryValue === 0 && <div style={{ fontSize: 10, color: "#94a3b8" }}>Set cost price on products to see this</div>}
            </div>
            <button
              type="button"
              onClick={() => setLowStockOnly((v) => !v)}
              style={{
                background: lowStockOnly ? "#fef2f2" : "#fff",
                border: `1px solid ${lowStockOnly ? "#fecdd3" : "#f1f5f9"}`,
                borderRadius: 12,
                padding: "10px 16px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 11, color: lowStockOnly ? "#e11d48" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Low stock (≤{LOW_STOCK_THRESHOLD})
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: lowStockOnly ? "#e11d48" : "#0f172a" }}>
                {lowStockCount} {lowStockOnly ? "· showing" : "· tap to filter"}
              </div>
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or product code…"
            style={{ width: "100%", maxWidth: 360, padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, marginBottom: 16 }}
          />
        </>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading products…</p>
      ) : products.length === 0 ? (
        <p style={{ color: "#64748b" }}>No products yet. Add your first one to go live.</p>
      ) : filteredProducts.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          {lowStockOnly && !search.trim() ? "No products are low on stock right now." : `No products match "${search}".`}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="sio-card"
              style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 14 }}
            >
              <img src={p.images?.[0]?.url} alt={p.title} style={{ width: 56, height: 70, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  {p.title}
                  {p.productCode && (
                    <span
                      style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}
                    >
                      {p.productCode}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {p.gender} · {p.subCategory}
                  {p.color ? ` · ${p.color}` : ""} · {p.sizes.join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 110, flexShrink: 0 }}>
                <div style={{ fontWeight: 700 }}>₹{p.basePrice}</div>
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
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        textAlign: "right",
                        color: p.stockRemaining <= LOW_STOCK_THRESHOLD ? "#e11d48" : "#0f172a",
                      }}
                    />
                    <span style={{ fontSize: 12, color: p.stockRemaining <= LOW_STOCK_THRESHOLD ? "#e11d48" : "#64748b" }}>
                      {savingStockId === p.id ? "saving…" : "in stock"}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`/seller/products/${p.id}`}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontSize: 13 }}
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
                          background: deletingId === p.id ? "#fca5a5" : "#e11d48",
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
                        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: 13 }}
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
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #fecdd3", background: "#fff", color: "#e11d48", cursor: "pointer", fontSize: 13 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                {confirmingId === p.id && (
                  <span style={{ fontSize: 11, color: "#e11d48" }}>This can&rsquo;t be undone.</span>
                )}
                {deleteError && confirmingId === null && deletingId === null && (
                  <span style={{ fontSize: 11, color: "#e11d48" }}>{deleteError}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

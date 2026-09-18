"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../../lib/use-seller-store";

interface Product {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  sizes: string[];
  stockRemaining?: number;
  gender: string;
  subCategory: string;
  color?: string;
}

export default function SellerProductsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

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

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading products…</p>
      ) : products.length === 0 ? (
        <p style={{ color: "#64748b" }}>No products yet. Add your first one to go live.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => (
            <div
              key={p.id}
              className="sio-card"
              style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 14 }}
            >
              <img src={p.images?.[0]?.url} alt={p.title} style={{ width: 56, height: 70, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {p.gender} · {p.subCategory}
                  {p.color ? ` · ${p.color}` : ""} · {p.sizes.join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 90, flexShrink: 0 }}>
                <div style={{ fontWeight: 700 }}>₹{p.basePrice}</div>
                {p.stockRemaining != null && (
                  <div style={{ fontSize: 12, color: p.stockRemaining <= 5 ? "#e11d48" : "#64748b" }}>{p.stockRemaining} in stock</div>
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

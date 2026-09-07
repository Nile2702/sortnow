"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../lib/use-seller-store";

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
}

export default function SellerProductsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This can't be undone.")) return;
    await fetch(`/api/v1/seller/products/${id}`, { method: "DELETE" });
    if (store) load(store.id);
  }

  if (storeLoading || !store) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Products</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{store.name} · {products.length} SKUs</p>
        </div>
        <Link
          href="/seller/products/new"
          style={{ padding: "10px 20px", borderRadius: 999, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
        >
          + Add Product
        </Link>
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
              style={{ display: "flex", gap: 16, alignItems: "center", background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 14 }}
            >
              <img src={p.images?.[0]?.url} alt={p.title} style={{ width: 56, height: 70, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {p.gender} · {p.subCategory} · {p.sizes.join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 90 }}>
                <div style={{ fontWeight: 700 }}>₹{p.basePrice}</div>
                {p.stockRemaining != null && (
                  <div style={{ fontSize: 12, color: p.stockRemaining <= 5 ? "#e11d48" : "#64748b" }}>{p.stockRemaining} in stock</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/seller/products/${p.id}`}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none", fontSize: 13 }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #fecdd3", background: "#fff", color: "#e11d48", cursor: "pointer", fontSize: 13 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

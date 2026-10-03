"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSellerStore } from "../../../../../lib/use-seller-store";
import { ProductForm } from "../../../../../components/ProductForm";
import { PageSkeleton } from "../../../../../components/PageSkeleton";

interface Product {
  id: string;
  title: string;
  description?: string;
  fabric?: string;
  color?: string;
  brand?: string;
  productCode?: string;
  gender: string;
  subCategory: string;
  basePrice: number;
  compareAtPrice?: number;
  costPrice?: number;
  sizes: string[];
  stockRemaining?: number;
  images: { url: string }[];
}

export default function EditProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const { store, loading: storeLoading } = useSellerStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // The seller-authenticated route, not the public /api/v1/products one -
    // that route strips costPrice (never meant to reach a shopper), which
    // left this Edit page unable to show or re-save it.
    fetch(`/api/v1/seller/products/${productId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setProduct)
      // Without this, a dropped/failed request here was an unhandled
      // rejection - `product` stayed null forever, and the "Loading…" gate
      // below has no way to tell "still loading" apart from "never going
      // to", so the page was stuck on it permanently.
      .catch(() => setLoadFailed(true));
  }, [productId]);

  if (loadFailed) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load this product.</p>
        <button
          onClick={() => {
            setLoadFailed(false);
            setProduct(null);
            fetch(`/api/v1/seller/products/${productId}`)
              .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
              .then(setProduct)
              .catch(() => setLoadFailed(true));
          }}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </main>
    );
  }

  if (storeLoading || !store || !product) {
    return <PageSkeleton maxWidth={700} />;
  }

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Edit Product</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>{store.name}</p>
      <ProductForm
        storeId={store.id}
        mode="edit"
        initialImageUrl={product.images?.[0]?.url}
        initialAdditionalImages={product.images?.slice(1).map((img) => img.url)}
        initial={{
          id: product.id,
          title: product.title,
          description: product.description ?? "",
          fabric: product.fabric ?? "",
          color: product.color,
          brand: product.brand,
          productCode: product.productCode,
          gender: product.gender,
          subCategory: product.subCategory,
          basePrice: product.basePrice,
          compareAtPrice: product.compareAtPrice,
          costPrice: product.costPrice,
          sizes: product.sizes,
          stockRemaining: product.stockRemaining ?? 0,
        }}
      />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSellerStore } from "../../../../../lib/use-seller-store";
import { ProductForm } from "../../../../../components/ProductForm";

interface Product {
  id: string;
  title: string;
  description?: string;
  fabric?: string;
  gender: string;
  subCategory: string;
  basePrice: number;
  compareAtPrice?: number;
  sizes: string[];
  stockRemaining?: number;
  images: { url: string }[];
}

export default function EditProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const { store, loading: storeLoading } = useSellerStore();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch(`/api/v1/products/${productId}`)
      .then((r) => r.json())
      .then(setProduct);
  }, [productId]);

  if (storeLoading || !store || !product) {
    return <main style={{ maxWidth: 700, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Edit Product</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>{store.name}</p>
      <ProductForm
        storeId={store.id}
        mode="edit"
        initialImageUrl={product.images?.[0]?.url}
        initial={{
          id: product.id,
          title: product.title,
          description: product.description ?? "",
          fabric: product.fabric ?? "",
          gender: product.gender,
          subCategory: product.subCategory,
          basePrice: product.basePrice,
          compareAtPrice: product.compareAtPrice,
          sizes: product.sizes,
          stockRemaining: product.stockRemaining ?? 0,
        }}
      />
    </main>
  );
}

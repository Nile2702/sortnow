"use client";

import { useSellerStore } from "../../../../lib/use-seller-store";
import { ProductForm } from "../../../../components/ProductForm";

export default function NewProductPage() {
  const { store, loading } = useSellerStore();

  if (loading || !store) {
    return <main style={{ maxWidth: 700, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Add a Product</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>Listing to {store.name}</p>
      <ProductForm storeId={store.id} mode="create" />
    </main>
  );
}

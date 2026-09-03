"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { addToCart } from "../../../lib/cart";

interface ProductDetail {
  id: string;
  title: string;
  description?: string;
  fabric?: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  sizes: string[];
  stockRemaining?: number;
  storeSlug: string;
  store: { name: string; city: string; localMarket: string };
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [size, setSize] = useState<string>("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        setProduct(p);
        if (p?.sizes?.length) setSize(p.sizes[0]);
      });
  }, [productId]);

  if (!product) {
    return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>Loading…</main>;
  }

  function handleAddToCart() {
    if (!product) return;
    addToCart({
      productId: product.id,
      title: product.title,
      storeSlug: product.storeSlug,
      storeName: product.store.name,
      size,
      price: product.basePrice,
      imageUrl: product.images[0]?.url ?? "",
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "8px 16px 40px" }}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        <Link href="/" style={{ color: "#64748b" }}>
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/store/${product.storeSlug}`} style={{ color: "#64748b" }}>
          {product.store.name}
        </Link>{" "}
        / {product.title}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <img
          src={product.images[0]?.url}
          alt={product.title}
          style={{ width: "100%", borderRadius: 12, aspectRatio: "3/4", objectFit: "cover" }}
        />

        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{product.title}</h1>
          <div style={{ color: "#64748b", marginBottom: 16 }}>
            Sold by{" "}
            <Link href={`/store/${product.storeSlug}`} style={{ color: "#2563eb" }}>
              {product.store.name}
            </Link>{" "}
            · {product.store.localMarket}, {product.store.city}
          </div>

          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            ₹{product.basePrice}
            {product.compareAtPrice && (
              <span style={{ textDecoration: "line-through", marginLeft: 10, fontSize: 18, fontWeight: 400, color: "#94a3b8" }}>
                ₹{product.compareAtPrice}
              </span>
            )}
          </div>

          {product.stockRemaining != null && product.stockRemaining <= 5 && (
            <div style={{ color: "#e11d48", fontSize: 14, marginBottom: 16 }}>Only {product.stockRemaining} left</div>
          )}

          {product.fabric && <div style={{ marginBottom: 8, fontSize: 14 }}>Fabric: {product.fabric}</div>}
          {product.description && <p style={{ color: "#334155", marginBottom: 20 }}>{product.description}</p>}

          {product.sizes?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Size</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: size === s ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            style={{
              padding: "14px 28px",
              borderRadius: 10,
              border: "none",
              background: added ? "#16a34a" : "#0f172a",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
              width: "100%",
            }}
          >
            {added ? "Added to cart" : "Add to Cart"}
          </button>

          <button
            onClick={() => router.push(`/store/${product.storeSlug}`)}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 14,
              cursor: "pointer",
              width: "100%",
              marginTop: 10,
            }}
          >
            Visit {product.store.name}'s storefront
          </button>
        </div>
      </div>
    </main>
  );
}

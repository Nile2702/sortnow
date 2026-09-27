"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toggleWishlist, isWishlisted } from "../lib/wishlist";

export interface ProductCardData {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  storeSlug: string;
  storeName?: string;
  stockRemaining?: number;
}

// The one shared product card for every shopper-facing grid (homepage,
// search, category pages, store pages, and the "You Might Also Like" /
// "Complete the Look" strips) - previously each of those duplicated its own
// near-identical card markup. Styled to the "Package I - Conversion-
// Optimized DTC" look: plain white card, image on top, bold price below,
// no tilt/gradient decoration - optimized for fast scanning, not visual
// flourish, which is the whole point of that pattern.
export function ProductCard({
  product,
  index = 0,
  showStore = true,
}: {
  product: ProductCardData;
  index?: number;
  showStore?: boolean;
}) {
  const [wishlisted, setWishlisted] = useState(false);
  useEffect(() => setWishlisted(isWishlisted(product.id)), [product.id]);

  const soldOut = product.stockRemaining === 0;
  const lowStock = !soldOut && product.stockRemaining != null && product.stockRemaining <= 5;
  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.basePrice
      ? Math.round(((product.compareAtPrice - product.basePrice) / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="sio-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
      <Link
        href={`/product/${product.id}`}
        className="sio-card"
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #ececec",
          background: "#fff",
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={product.images?.[0]?.url}
            alt={product.title}
            loading="lazy"
            style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
          />

          {discountPct > 0 && (
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: "#16a34a",
                color: "#fff",
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {discountPct}% OFF
            </span>
          )}

          {soldOut && (
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: "rgba(17,17,17,0.85)",
                color: "#fff",
                fontSize: 9.5,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Sold Out
            </span>
          )}

          <button
            className="sio-heart-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setWishlisted(
                toggleWishlist({
                  productId: product.id,
                  title: product.title,
                  storeSlug: product.storeSlug,
                  storeName: product.storeName ?? "",
                  price: product.basePrice,
                  imageUrl: product.images?.[0]?.url ?? "",
                })
              );
            }}
            aria-label="Toggle wishlist"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid #eee",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: wishlisted ? "#e11d48" : "#bbb",
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "10px 12px 12px" }}>
          {showStore && product.storeName && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#9a9a9a",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {product.storeName}
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.3,
              color: "#111",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.5em",
            }}
          >
            {product.title}
          </div>
          <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>₹{product.basePrice}</span>
            {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
              <span style={{ opacity: 0.55, fontSize: 11.5, textDecoration: "line-through", color: "#111" }}>₹{product.compareAtPrice}</span>
            )}
          </div>
          {lowStock && <div style={{ fontSize: 10.5, color: "#dc2626", fontWeight: 600, marginTop: 3 }}>Only {product.stockRemaining} left</div>}
        </div>
      </Link>
    </div>
  );
}

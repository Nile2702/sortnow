"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toggleWishlist, isWishlisted } from "../lib/wishlist";
import { TiltCard } from "./TiltCard";

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
// near-identical white-card-text-below markup. Restyled to a single
// full-bleed photo with a dark gradient and bold white overlay text (the
// "Look G" visual language from the Discover swipe deck), applied to every
// existing grid rather than replacing any of them with an actual swipe
// gesture - comparison shopping still needs to see many items at once.
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
      <TiltCard>
        <Link
          href={`/product/${product.id}`}
          className="sio-card"
          style={{
            position: "relative",
            display: "block",
            textDecoration: "none",
            color: "inherit",
            borderRadius: 20,
            overflow: "hidden",
            aspectRatio: "3/4",
            background: "#111",
          }}
        >
          <img
            src={product.images?.[0]?.url}
            alt={product.title}
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            aria-hidden
            style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.82) 100%)" }}
          />

          {discountPct > 0 && (
            <span
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "#16a34a",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 999,
              }}
            >
              {discountPct}% OFF
            </span>
          )}

          {soldOut && (
            <span
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "rgba(0,0,0,0.78)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 999,
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
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 2px 6px rgba(15,23,42,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: wishlisted ? "#e11d48" : "#94a3b8",
              zIndex: 1,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
            </svg>
          </button>

          <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, color: "#fff" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {product.title}
            </div>
            {showStore && product.storeName && (
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {product.storeName}
              </div>
            )}
            <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 14.5 }}>₹{product.basePrice}</span>
              {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                <span style={{ opacity: 0.7, fontSize: 11, textDecoration: "line-through" }}>₹{product.compareAtPrice}</span>
              )}
            </div>
            {lowStock && (
              <div style={{ fontSize: 10.5, color: "#fca5a5", fontWeight: 600, marginTop: 2 }}>Only {product.stockRemaining} left</div>
            )}
          </div>
        </Link>
      </TiltCard>
    </div>
  );
}

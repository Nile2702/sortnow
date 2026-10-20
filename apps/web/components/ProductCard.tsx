"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toggleWishlist, isWishlisted } from "../lib/wishlist";

// A rough walk-time estimate from distance alone (average walking speed
// ~5 km/h, i.e. 12 min/km) - not routed, just enough to make "near you"
// concrete ("Try on in 10 mins" lands harder than "0.8 km away" on its
// own), which is the whole point of an O2O platform's product card.
// Rounded to the nearest 5 minutes so it reads like an estimate, not a
// precise figure the math can't actually back up.
function walkingMinutes(distanceKm: number): number {
  return Math.max(5, Math.round((distanceKm * 12) / 5) * 5);
}

export interface ProductCardData {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  storeSlug: string;
  storeName?: string;
  stockRemaining?: number;
  distanceKm?: number | null;
  // Set by lib/seed-data.ts applyActiveSales() when a seller's sale
  // campaign currently discounts this product - distinct from a seller's
  // own static compareAtPrice markdown, which has no campaign/end time
  // behind it and isn't a "sale" in this sense.
  onSale?: boolean;
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
    // height: 100% here is load-bearing, not decorative - this div sits
    // between the scroll-row item's own flex wrapper (stretched to the
    // row's tallest card by .sio-scroll-row's default align-items: stretch)
    // and the <Link> below, which wants height: 100% of *this* div.
    // Without it, this plain block div just shrinks to its own content
    // height regardless of how tall its stretched parent actually is,
    // which breaks the stretch chain partway through - every card ends up
    // sized to its own content instead of matching its row siblings, which
    // is exactly why a card missing the trailing low-stock/distance line
    // (see marginTop: "auto" below) looked visibly shorter than ones that
    // had it, instead of just having blank space at the bottom like them.
    <div className="sio-fade-in" style={{ animationDelay: `${index * 40}ms`, height: "100%" }}>
      <Link
        href={`/product/${product.id}`}
        className="sio-card"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          textDecoration: "none",
          color: "inherit",
          borderRadius: 14,
          overflow: "hidden",
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

          {soldOut ? (
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
                borderRadius: 6,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Sold Out
            </span>
          ) : (
            product.onSale && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  background: "var(--sio-glow)",
                  color: "#fff",
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Sale
              </span>
            )
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
              color: wishlisted ? "var(--sio-bronze)" : "#bbb",
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

        </div>

        <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", flex: 1 }}>
          {showStore && product.storeName && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--sio-ink)",
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
              fontSize: 12.5,
              fontWeight: 400,
              lineHeight: 1.3,
              color: "var(--sio-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.5em",
            }}
          >
            {product.title}
          </div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--sio-ink)" }}>₹{product.basePrice.toLocaleString("en-IN")}</span>
            {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
              <span style={{ fontSize: 12, textDecoration: "line-through", color: "var(--sio-muted)" }}>₹{product.compareAtPrice.toLocaleString("en-IN")}</span>
            )}
            {discountPct > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sio-glow)" }}>{discountPct}% OFF</span>}
          </div>
          {/* Pinned to the bottom of the card (marginTop: auto fills whatever
              space is left in the flex column above) rather than sitting
              directly under the price - cards vary in how many of these
              trailing lines they actually have (distance, low-stock, both,
              or neither), and without this the cards in the same row ended
              up visibly different heights/bottoms depending on which lines
              a given product happened to need. */}
          <div style={{ marginTop: "auto", paddingTop: 4 }}>
            {product.distanceKm != null && (
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "#1e3a8a" }}>
                📍 {product.distanceKm} km away • Try on in {walkingMinutes(product.distanceKm)} mins
              </div>
            )}
            {lowStock && <div style={{ fontSize: 10.5, color: "#dc2626", fontWeight: 600, marginTop: 3 }}>Only {product.stockRemaining} left</div>}
          </div>
        </div>
      </Link>
    </div>
  );
}

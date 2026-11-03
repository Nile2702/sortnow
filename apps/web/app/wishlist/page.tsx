"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WishlistItem, getWishlist, removeFromWishlist } from "../../lib/wishlist";
import { showToast } from "../../lib/toast";
import { ProductCard } from "../../components/ProductCard";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    setItems(getWishlist());
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Your Wishlist</h1>

      {items.length === 0 ? (
        <div
          className="sio-fade-in sio-card"
          style={{
            textAlign: "center",
            padding: "40px 24px",
            borderRadius: 16,
            border: "1px solid var(--sio-line)",
            background: "#fff",
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nothing saved yet.</p>
          <p style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 20 }}>
            Tap the heart on anything you like and it'll show up here, ready to reserve whenever you're near the store.
          </p>
          <Link
            href="/"
            className="sio-shine-btn sio-btn-primary"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 999,
              background: "var(--sio-bronze)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Browse what's nearby
          </Link>
        </div>
      ) : (
        <div className="sio-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {/* Reuses the one shared ProductCard every other grid on the site
              renders (homepage, search, category, store pages) instead of
              this page's own bespoke markup, which used to fall out of sync
              with it - most recently, a store name wrapping to a different
              number of lines per item pushed the "View product"/"Remove"
              row to a different height card-to-card, since this page's
              version never got the stretch-chain/marginTop:auto fix the
              shared card already has. The Remove action lives outside the
              card itself (the card is a single <Link>, with no slot for a
              second action), sized to match it so the two still read as one
              unit. */}
          {items.map((item) => (
            <div key={item.productId} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ProductCard
                  product={{
                    id: item.productId,
                    title: item.title,
                    basePrice: item.price,
                    images: [{ url: item.imageUrl }],
                    storeSlug: item.storeSlug,
                    storeName: item.storeName,
                  }}
                />
              </div>
              <button
                onClick={() => {
                  removeFromWishlist(item.productId);
                  setItems(getWishlist());
                  showToast("Removed from Wishlist");
                }}
                style={{ marginTop: 8, padding: "8px 0", borderRadius: 10, border: "1px solid var(--sio-line)", background: "#fff", cursor: "pointer", fontSize: 13 }}
              >
                Remove from Wishlist
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

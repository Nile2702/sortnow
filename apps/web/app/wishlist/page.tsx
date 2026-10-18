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
        <p>
          Nothing saved yet. Tap the heart on any product to add it here.{" "}
          <Link href="/" style={{ color: "#1e3a8a" }}>
            Go find something nearby
          </Link>
          .
        </p>
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
                style={{ marginTop: 8, padding: "8px 0", borderRadius: 8, border: "1px solid var(--sio-line)", background: "#fff", cursor: "pointer", fontSize: 13 }}
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

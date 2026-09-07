"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WishlistItem, getWishlist, removeFromWishlist } from "../../lib/wishlist";
import { addToCart } from "../../lib/cart";

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
          <Link href="/" style={{ color: "#2563eb" }}>
            Go find something nearby
          </Link>
          .
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {items.map((item) => (
            <div key={item.productId} className="sio-card" style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
              <Link href={`/product/${item.productId}`}>
                <img src={item.imageUrl} alt={item.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
              </Link>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{item.storeName}</div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>₹{item.price}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      addToCart({
                        productId: item.productId,
                        title: item.title,
                        storeSlug: item.storeSlug,
                        storeName: item.storeName,
                        size: "Free Size",
                        price: item.price,
                        imageUrl: item.imageUrl,
                        quantity: 1,
                      })
                    }
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: 13 }}
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => {
                      removeFromWishlist(item.productId);
                      setItems(getWishlist());
                    }}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

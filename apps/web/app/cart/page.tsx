"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, getCart, removeFromCart, updateQuantity, cartTotal } from "../../lib/cart";
import { WishlistItem, getWishlist } from "../../lib/wishlist";
import { allowsMultipleQuantity, MAX_MULTIPLE_QUANTITY } from "../../lib/catalog-constants";
import { ProductCard, ProductCardData } from "../../components/ProductCard";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [similar, setSimilar] = useState<ProductCardData[]>([]);

  useEffect(() => {
    setItems(getCart());
    setWishlist(getWishlist());
  }, []);

  function refresh() {
    setItems(getCart());
  }

  // Seeds "You Might Also Like" off whatever's already in the sort, so the
  // cross-sell is at least contextually related to something the shopper is
  // already considering, rather than generic/unrelated picks. Keyed off the
  // first item's productId specifically (not the whole cart) so adding/
  // removing other lines doesn't keep refetching this strip.
  const seedProductId = items[0]?.productId;
  useEffect(() => {
    if (!seedProductId) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/products/${seedProductId}/similar`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSimilar(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seedProductId]);

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4, fontWeight: 700 }}>Your Sort</h1>
      <p style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 20 }}>
        Pick out what you want, then reserve it at the store for a set time so it's held for you to walk in and try on or buy.
      </p>

      {items.length === 0 ? (
        wishlist.length > 0 ? (
          <div className="sio-fade-in">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--sio-cream)",
                border: "1px solid var(--sio-line)",
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 12.5,
                color: "var(--sio-ink)",
              }}
            >
              <span style={{ fontWeight: 700 }}>No online payment.</span>
              <span style={{ color: "var(--sio-muted)" }}>Reserve for free, try it on at the store, and pay only if you keep it.</span>
            </div>

            <p style={{ marginBottom: 16 }}>
              Your sort is empty, but you've saved {wishlist.length} {wishlist.length === 1 ? "item" : "items"} to your wishlist. Start there:
            </p>

            <div className="sio-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {wishlist.map((item, i) => (
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
                      index={i}
                    />
                  </div>
                  {/* Wishlist items don't carry a size (see lib/wishlist.ts),
                      so a one-tap "Add to Sort" isn't possible without
                      guessing one - this sends the shopper to the product
                      page to pick a size, which already has its own
                      Add to Sort action. */}
                  <Link
                    href={`/product/${item.productId}`}
                    style={{
                      marginTop: 8,
                      padding: "8px 0",
                      borderRadius: 10,
                      border: "1px solid var(--sio-line)",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "center",
                      textDecoration: "none",
                      color: "var(--sio-ink)",
                    }}
                  >
                    Choose Size & Add to Sort
                  </Link>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 20 }}>
              Or{" "}
              <Link href="/" style={{ color: "var(--sio-ink)" }}>
                go find something nearby
              </Link>
              .
            </p>
          </div>
        ) : (
          <p>
            Your sort is empty.{" "}
            <Link href="/" style={{ color: "var(--sio-ink)" }}>
              Go find something nearby
            </Link>
            .
          </p>
        )
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                className="sio-card"
                style={{ display: "flex", flexWrap: "wrap", gap: 16, background: "#fff", padding: 16, borderRadius: 16, alignItems: "center", border: "1px solid var(--sio-cream)" }}
              >
                <img src={item.imageUrl} alt={item.title} style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                {/* minWidth: 0 lets this shrink/wrap normally within the flex
                    row - without it, the title had no minimum-size override
                    so the row squeezed it down to its narrowest word instead
                    of using the space actually available. */}
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ color: "var(--sio-muted)", fontSize: 13 }}>
                    {item.storeName} · Size {item.size}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>₹{item.price.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
                  {allowsMultipleQuantity(item.subCategory) ? (
                    <input
                      type="number"
                      aria-label={`Quantity for ${item.title}, size ${item.size}`}
                      min={1}
                      max={MAX_MULTIPLE_QUANTITY}
                      value={item.quantity}
                      onChange={(e) => {
                        updateQuantity(item.productId, item.size, Math.min(MAX_MULTIPLE_QUANTITY, Number(e.target.value)));
                        refresh();
                      }}
                      style={{ width: 56, padding: 6, borderRadius: 10, border: "1px solid var(--sio-line)" }}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--sio-muted)" }}>Qty 1</span>
                  )}
                  <button
                    onClick={() => {
                      removeFromCart(item.productId, item.size);
                      refresh();
                    }}
                    style={{ border: "none", background: "none", color: "var(--sio-error)", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {new Set(items.map((i) => i.storeSlug)).size > 1 && (
            <p style={{ fontSize: 12, color: "var(--sio-pending)", marginTop: 16 }}>
              These items are from {new Set(items.map((i) => i.storeSlug)).size} different stores — reserving will create a separate reservation at
              each store, since you'll need to visit each in person.
            </p>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Total: ₹{cartTotal(items).toLocaleString("en-IN")}</div>
            <button
              onClick={() => router.push("/reserve")}
              className="sio-shine-btn sio-btn-primary"
              style={{
                padding: "14px 28px",
                borderRadius: 999,
                border: "none",
                background: "var(--sio-bronze)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reserve for Pickup
            </button>
          </div>

          {similar.length > 0 && (
            <section className="sio-fade-in" style={{ marginTop: 40 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  paddingBottom: 14,
                  borderBottom: "1px solid var(--sio-line)",
                }}
              >
                You Might Also Like
              </h2>
              <div
                className="sio-product-grid"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 24, marginTop: 20 }}
              >
                {similar.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

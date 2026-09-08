"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { addToCart } from "../../../lib/cart";
import { toggleWishlist, isWishlisted } from "../../../lib/wishlist";

interface ProductDetail {
  id: string;
  title: string;
  description?: string;
  fabric?: string;
  gender: string;
  subCategory: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  sizes: string[];
  stockRemaining?: number;
  storeSlug: string;
  store: { name: string; city: string; localMarket: string; pincode: string };
}

interface Review {
  id: string;
  authorName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

interface RatingSummary {
  average: number;
  count: number;
  breakdown: { star: number; count: number }[];
}

interface SimilarProduct {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  storeName: string;
  storeSlug: string;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#f59e0b" : "#e2e8f0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [size, setSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingSummary>({ average: 0, count: 0, breakdown: [] });
  const [similar, setSimilar] = useState<SimilarProduct[]>([]);

  const [checkPincode, setCheckPincode] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState("");

  const [reviewForm, setReviewForm] = useState({ authorName: "", rating: 5, title: "", comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        setProduct(p);
        if (p?.sizes?.length) setSize(p.sizes[0]);
        if (p) setWishlisted(isWishlisted(p.id));
      });
    fetch(`/api/v1/products/${productId}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews);
        setSummary(d.summary);
      });
    fetch(`/api/v1/products/${productId}/similar`)
      .then((r) => r.json())
      .then(setSimilar);
  }, [productId]);

  if (!product) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>Loading…</main>;
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
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleToggleWishlist() {
    if (!product) return;
    setWishlisted(
      toggleWishlist({
        productId: product.id,
        title: product.title,
        storeSlug: product.storeSlug,
        storeName: product.store.name,
        price: product.basePrice,
        imageUrl: product.images[0]?.url ?? "",
      })
    );
  }

  function handleCheckDelivery() {
    if (checkPincode.length !== 6) {
      setDeliveryMsg("Enter a valid 6-digit PIN code.");
      return;
    }
    const sameCity = checkPincode.slice(0, 3) === product!.store.pincode.slice(0, 3);
    const days = sameCity ? "1-2" : "3-5";
    setDeliveryMsg(`Delivery by ${days} business days to ${checkPincode}. Free returns within 7 days.`);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReview(true);
    const res = await fetch(`/api/v1/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    const newReview = await res.json();
    setReviews((r) => [newReview, ...r]);
    setSummary((s) => ({
      average: Math.round((((s.average * s.count) + newReview.rating) / (s.count + 1)) * 10) / 10,
      count: s.count + 1,
      breakdown: s.breakdown.map((b) => (b.star === newReview.rating ? { ...b, count: b.count + 1 } : b)),
    }));
    setReviewForm({ authorName: "", rating: 5, title: "", comment: "" });
    setSubmittingReview(false);
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);
  }

  const discountPct = product.compareAtPrice ? Math.round(((product.compareAtPrice - product.basePrice) / product.compareAtPrice) * 100) : 0;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 56px" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
        <Link href="/" style={{ color: "#94a3b8" }}>
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/category/${product.gender}`} style={{ color: "#94a3b8", textTransform: "capitalize" }}>
          {product.gender}
        </Link>{" "}
        /{" "}
        <Link href={`/store/${product.storeSlug}`} style={{ color: "#94a3b8" }}>
          {product.store.name}
        </Link>{" "}
        / {product.title}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
        <div style={{ position: "relative" }}>
          <img src={product.images[0]?.url} alt={product.title} style={{ width: "100%", borderRadius: 16, aspectRatio: "3/4", objectFit: "cover" }} />
          {discountPct > 0 && (
            <span style={{ position: "absolute", top: 12, left: 12, background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
              {discountPct}% OFF
            </span>
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>{product.title}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {summary.count > 0 ? (
              <>
                <Stars rating={summary.average} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{summary.average}</span>
                <a href="#reviews" style={{ fontSize: 13, color: "#2563eb" }}>
                  {summary.count} review{summary.count !== 1 ? "s" : ""}
                </a>
              </>
            ) : (
              <span style={{ fontSize: 13, color: "#94a3b8" }}>No reviews yet</span>
            )}
          </div>

          <div style={{ color: "#64748b", marginBottom: 16, fontSize: 14 }}>
            Sold by{" "}
            <Link href={`/store/${product.storeSlug}`} style={{ color: "#2563eb", fontWeight: 600 }}>
              {product.store.name}
            </Link>{" "}
            · {product.store.localMarket}, {product.store.city}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>₹{product.basePrice}</span>
            {product.compareAtPrice && (
              <span style={{ textDecoration: "line-through", fontSize: 18, color: "#94a3b8" }}>₹{product.compareAtPrice}</span>
            )}
            {discountPct > 0 && <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 14 }}>{discountPct}% off</span>}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Inclusive of all taxes</div>

          {product.stockRemaining != null && product.stockRemaining <= 5 && (
            <div style={{ color: "#e11d48", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Only {product.stockRemaining} left in stock</div>
          )}

          {product.sizes?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Size</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: size === s ? "2px solid #0f172a" : "1px solid #cbd5e1",
                      background: "#fff",
                      fontWeight: size === s ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Quantity</div>
            <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8 }}>
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={qtyBtnStyle()}>
                −
              </button>
              <span style={{ width: 40, textAlign: "center", fontWeight: 600 }}>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} style={qtyBtnStyle()}>
                +
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={handleAddToCart}
              style={{
                flex: 1,
                padding: "15px 24px",
                borderRadius: 10,
                border: "none",
                background: added ? "#16a34a" : "#0f172a",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {added ? "Added to cart ✓" : "Add to Cart"}
            </button>
            <button
              onClick={handleToggleWishlist}
              aria-label="Toggle wishlist"
              style={{
                width: 52,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: wishlisted ? "#e11d48" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
              </svg>
            </button>
          </div>

          {/* Delivery check */}
          <div style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Check delivery availability</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={checkPincode}
                onChange={(e) => setCheckPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter PIN code"
                maxLength={6}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
              />
              <button onClick={handleCheckDelivery} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Check
              </button>
            </div>
            {deliveryMsg && <div style={{ fontSize: 13, color: "#16a34a", marginTop: 10 }}>{deliveryMsg}</div>}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748b", marginBottom: 20 }}>
            <span>🔒 Secure Payment</span>
            <span>↩️ 7-Day Easy Returns</span>
            <span>💵 Cash on Delivery</span>
          </div>

          <button
            onClick={() => router.push(`/store/${product.storeSlug}`)}
            style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontSize: 14, cursor: "pointer", width: "100%" }}
          >
            Visit {product.store.name}'s storefront
          </button>
        </div>
      </div>

      {/* Description & Specifications */}
      <section style={{ marginBottom: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Product Description</h2>
          <p style={{ color: "#334155", lineHeight: 1.7, fontSize: 14 }}>{product.description || "No description provided by the seller."}</p>
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Specifications</h2>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Category", `${product.gender} / ${product.subCategory}`],
                ["Fabric", product.fabric || "—"],
                ["Available sizes", product.sizes.join(", ")],
                ["Sold by", product.store.name],
                ["Product ID", product.id],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 0", color: "#64748b", width: "40%", textTransform: "capitalize" }}>{label}</td>
                  <td style={{ padding: "10px 0", fontWeight: 500, textTransform: label === "Category" ? "capitalize" : "none" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" style={{ marginBottom: 48, borderTop: "1px solid #f1f5f9", paddingTop: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Customer Reviews</h2>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 40, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 700 }}>{summary.average || "—"}</div>
            <Stars rating={summary.average} size={18} />
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{summary.count} review{summary.count !== 1 ? "s" : ""}</div>

            <div style={{ marginTop: 16 }}>
              {summary.breakdown.map((b) => (
                <div key={b.star} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ width: 32 }}>{b.star}★</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: summary.count ? `${(b.count / summary.count) * 100}%` : "0%",
                        background: "#f59e0b",
                      }}
                    />
                  </div>
                  <span style={{ width: 20, color: "#94a3b8" }}>{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {reviews.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No reviews yet — be the first to share your experience.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ borderBottom: "1px solid #f8fafc", paddingBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Stars rating={r.rating} />
                      {r.verifiedPurchase && (
                        <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, background: "#dcfce7", padding: "2px 8px", borderRadius: 999 }}>
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    {r.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>}
                    <p style={{ fontSize: 14, color: "#334155", marginBottom: 6, lineHeight: 1.6 }}>{r.comment}</p>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {r.authorName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Write a review */}
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: 20, maxWidth: 520 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Write a review</h3>
          <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  aria-label={`Rate ${star} stars`}
                >
                  <svg width={26} height={26} viewBox="0 0 24 24" fill={star <= reviewForm.rating ? "#f59e0b" : "#e2e8f0"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            <input
              required
              value={reviewForm.authorName}
              onChange={(e) => setReviewForm((f) => ({ ...f, authorName: e.target.value }))}
              placeholder="Your name"
              style={reviewInputStyle()}
            />
            <input
              value={reviewForm.title}
              onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Review title (optional)"
              style={reviewInputStyle()}
            />
            <textarea
              required
              value={reviewForm.comment}
              onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Share your experience with this product…"
              rows={3}
              style={{ ...reviewInputStyle(), resize: "vertical" }}
            />
            <button
              type="submit"
              disabled={submittingReview}
              style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}
            >
              {submittingReview ? "Submitting…" : "Submit Review"}
            </button>
            {reviewSubmitted && <span style={{ color: "#16a34a", fontSize: 13 }}>✓ Thanks for your review!</span>}
          </form>
        </div>
      </section>

      {/* Similar products */}
      {similar.length > 0 && (
        <section style={{ borderTop: "1px solid #f1f5f9", paddingTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>You Might Also Like</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {similar.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="sio-card sio-fade-in"
                style={{ textDecoration: "none", color: "inherit", borderRadius: 14, overflow: "hidden", border: "1px solid #f1f5f9", background: "#fff" }}
              >
                <img src={p.images?.[0]?.url} alt={p.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.storeName}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 700 }}>₹{p.basePrice}</span>
                    {p.compareAtPrice && <span style={{ textDecoration: "line-through", marginLeft: 6, opacity: 0.55, fontSize: 12 }}>₹{p.compareAtPrice}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function qtyBtnStyle(): React.CSSProperties {
  return { width: 36, height: 36, border: "none", background: "#fff", fontSize: 18, cursor: "pointer" };
}

function reviewInputStyle(): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 };
}

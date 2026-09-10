"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { addToCart } from "../../../lib/cart";
import { toggleWishlist, isWishlisted } from "../../../lib/wishlist";
import { showToast } from "../../../lib/toast";
import { getShopperSession } from "../../../lib/shopper-session";

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
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "var(--sio-bronze)" : "var(--sio-line)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

const SECTION_CARD: React.CSSProperties = {
  background: "var(--sio-paper)",
  border: "1px solid var(--sio-line)",
  borderRadius: 4,
};

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

  useEffect(() => {
    const shopper = getShopperSession();
    if (shopper) setReviewForm((f) => (f.authorName ? f : { ...f, authorName: shopper.name }));
  }, []);
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
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <div className="sio-skeleton" style={{ aspectRatio: "3/4" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="sio-skeleton" style={{ height: 32, width: "80%" }} />
            <div className="sio-skeleton" style={{ height: 20, width: "40%" }} />
            <div className="sio-skeleton" style={{ height: 48, width: "50%" }} />
          </div>
        </div>
      </main>
    );
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
    showToast(`Added to Sort — ${product.title}`, "success");
  }

  function handleToggleWishlist() {
    if (!product) return;
    const nowWishlisted = toggleWishlist({
      productId: product.id,
      title: product.title,
      storeSlug: product.storeSlug,
      storeName: product.store.name,
      price: product.basePrice,
      imageUrl: product.images[0]?.url ?? "",
    });
    setWishlisted(nowWishlisted);
    showToast(nowWishlisted ? "Saved to Wishlist" : "Removed from Wishlist");
  }

  function handleCheckDelivery() {
    if (checkPincode.length !== 6) {
      setDeliveryMsg("Enter a valid 6-digit PIN code.");
      return;
    }
    const sameCity = checkPincode.slice(0, 3) === product!.store.pincode.slice(0, 3);
    const days = sameCity ? "1–2" : "3–5";
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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 64px" }}>
      <div className="sio-fade-in" style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 20, letterSpacing: "0.02em" }}>
        <Link href="/" style={{ color: "var(--sio-muted)" }}>
          Home
        </Link>{" "}
        &nbsp;/&nbsp;
        <Link href={`/category/${product.gender}`} style={{ color: "var(--sio-muted)", textTransform: "capitalize" }}>
          {product.gender}
        </Link>{" "}
        &nbsp;/&nbsp;
        <Link href={`/store/${product.storeSlug}`} style={{ color: "var(--sio-muted)" }}>
          {product.store.name}
        </Link>{" "}
        &nbsp;/&nbsp; <span style={{ color: "var(--sio-ink)" }}>{product.title}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 56 }}>
        <div className="sio-fade-in sio-zoom-hover" style={{ position: "relative" }}>
          <img src={product.images[0]?.url} alt={product.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
          {discountPct > 0 && (
            <span
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                background: "var(--sio-ink)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                padding: "6px 12px",
              }}
            >
              {discountPct}% OFF
            </span>
          )}
        </div>

        <div className="sio-fade-in" style={{ animationDelay: "90ms" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--sio-bronze)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase" }}>
            {product.store.name}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 12, lineHeight: 1.2 }}>{product.title}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            {summary.count > 0 ? (
              <>
                <Stars rating={summary.average} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{summary.average}</span>
                <a href="#reviews" style={{ fontSize: 12, color: "var(--sio-muted)", textDecoration: "underline" }}>
                  {summary.count} review{summary.count !== 1 ? "s" : ""}
                </a>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "var(--sio-muted)" }}>No reviews yet</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 600 }}>₹{product.basePrice}</span>
            {product.compareAtPrice && (
              <span style={{ textDecoration: "line-through", fontSize: 16, color: "var(--sio-muted)" }}>₹{product.compareAtPrice}</span>
            )}
            {discountPct > 0 && <span style={{ color: "var(--sio-bronze-dark)", fontWeight: 600, fontSize: 13 }}>Save {discountPct}%</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 20 }}>Inclusive of all taxes</div>

          {product.stockRemaining != null && product.stockRemaining <= 5 && (
            <div className="sio-breathe" style={{ color: "var(--sio-bronze-dark)", fontSize: 13, fontWeight: 500, marginBottom: 20, display: "inline-block" }}>
              Only {product.stockRemaining} left in stock
            </div>
          )}

          {product.sizes?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Size
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      padding: "9px 18px",
                      border: size === s ? "1px solid var(--sio-ink)" : "1px solid var(--sio-line)",
                      background: size === s ? "var(--sio-ink)" : "#fff",
                      color: size === s ? "#fff" : "var(--sio-ink)",
                      fontWeight: 500,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Quantity
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--sio-line)" }}>
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={qtyBtnStyle()}>
                −
              </button>
              <span style={{ width: 44, textAlign: "center", fontWeight: 600, fontSize: 14 }}>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} style={qtyBtnStyle()}>
                +
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button
              onClick={handleAddToCart}
              className="sio-btn-primary sio-shine-btn"
              style={{
                flex: 1,
                padding: "16px 24px",
                border: "none",
                background: added ? "var(--sio-bronze-dark)" : "var(--sio-ink)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {added ? "Added to Sort" : "Add to Sort"}
            </button>
            <button
              onClick={handleToggleWishlist}
              className="sio-heart-btn"
              aria-label="Toggle wishlist"
              style={{
                width: 54,
                border: "1px solid var(--sio-line)",
                background: "#fff",
                color: wishlisted ? "var(--sio-bronze-dark)" : "var(--sio-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={19} height={19} viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
                <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
              </svg>
            </button>
          </div>

          {/* Delivery check */}
          <div style={{ ...SECTION_CARD, padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sio-muted)" }}>
              Check delivery availability
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={checkPincode}
                onChange={(e) => setCheckPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter PIN code"
                maxLength={6}
                style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--sio-line)", fontSize: 14 }}
              />
              <button
                onClick={handleCheckDelivery}
                style={{ padding: "10px 20px", border: "none", background: "var(--sio-ink)", color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Check
              </button>
            </div>
            {deliveryMsg && (
              <div className="sio-fade-in" style={{ fontSize: 13, color: "var(--sio-bronze-dark)", marginTop: 12 }}>
                {deliveryMsg}
              </div>
            )}
          </div>

          {/* Trust line */}
          <div
            style={{
              display: "flex",
              gap: 0,
              fontSize: 12,
              color: "var(--sio-muted)",
              marginBottom: 24,
              borderTop: "1px solid var(--sio-line)",
              borderBottom: "1px solid var(--sio-line)",
              padding: "14px 0",
            }}
          >
            <span style={{ flex: 1, textAlign: "center", borderRight: "1px solid var(--sio-line)" }}>Secure Payment</span>
            <span style={{ flex: 1, textAlign: "center", borderRight: "1px solid var(--sio-line)" }}>7-Day Returns</span>
            <span style={{ flex: 1, textAlign: "center" }}>Cash on Delivery</span>
          </div>

          <button
            onClick={() => router.push(`/store/${product.storeSlug}`)}
            style={{ padding: "13px 24px", border: "1px solid var(--sio-line)", background: "#fff", fontSize: 13, letterSpacing: "0.03em", cursor: "pointer", width: "100%" }}
          >
            Visit {product.store.name}'s Storefront
          </button>
        </div>
      </div>

      {/* Description */}
      <section className="sio-fade-in" style={{ animationDelay: "150ms", marginBottom: 1 }}>
        <div style={{ ...SECTION_CARD, padding: 32, maxWidth: 760, marginBottom: 32 }}>
          <SectionHeading>Product Description</SectionHeading>
          <p style={{ color: "var(--sio-ink-soft)", lineHeight: 1.85, fontSize: 15, marginTop: 16 }}>
            {product.description || "No description provided by the seller."}
          </p>
        </div>
      </section>

      {/* Specifications */}
      <section className="sio-fade-in" style={{ animationDelay: "210ms" }}>
        <div style={{ ...SECTION_CARD, padding: 32, maxWidth: 640, marginBottom: 32 }}>
          <SectionHeading>Specifications</SectionHeading>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse", marginTop: 16 }}>
            <tbody>
              {[
                ["Category", `${product.gender} / ${product.subCategory}`],
                ["Fabric", product.fabric || "—"],
                ["Available sizes", product.sizes.join(", ")],
                ["Sold by", product.store.name],
                ["Product ID", product.id],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--sio-line)" }}>
                  <td style={{ padding: "12px 0", color: "var(--sio-muted)", width: "40%" }}>{label}</td>
                  <td style={{ padding: "12px 0", fontWeight: 500, textTransform: label === "Category" ? "capitalize" : "none" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="sio-fade-in" style={{ animationDelay: "270ms" }}>
        <div style={{ ...SECTION_CARD, padding: 32, marginBottom: 32 }}>
          <SectionHeading>Customer Reviews</SectionHeading>

          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 40, marginTop: 20, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 38, fontWeight: 600, fontFamily: "var(--site-font-heading)" }}>{summary.average || "—"}</div>
              <Stars rating={summary.average} size={16} />
              <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 6 }}>
                {summary.count} review{summary.count !== 1 ? "s" : ""}
              </div>

              <div style={{ marginTop: 18 }}>
                {summary.breakdown.map((b, i) => (
                  <div key={b.star} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 5 }}>
                    <span style={{ width: 32, color: "var(--sio-muted)" }}>{b.star}★</span>
                    <div style={{ flex: 1, height: 3, background: "var(--sio-line)", overflow: "hidden" }}>
                      <div
                        className="sio-fade-in"
                        style={{
                          height: "100%",
                          width: summary.count ? `${(b.count / summary.count) * 100}%` : "0%",
                          background: "var(--sio-bronze)",
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    </div>
                    <span style={{ width: 20, color: "var(--sio-muted)" }}>{b.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {reviews.length === 0 ? (
                <p style={{ color: "var(--sio-muted)", fontSize: 14 }}>No reviews yet — be the first to share your experience.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  {reviews.map((r, i) => (
                    <div key={r.id} className="sio-fade-in" style={{ borderBottom: "1px solid var(--sio-line)", paddingBottom: 18, animationDelay: `${i * 60}ms` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <Stars rating={r.rating} />
                        {r.verifiedPurchase && (
                          <span style={{ fontSize: 10, color: "var(--sio-bronze-dark)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      {r.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{r.title}</div>}
                      <p style={{ fontSize: 14, color: "var(--sio-ink-soft)", marginBottom: 8, lineHeight: 1.7 }}>{r.comment}</p>
                      <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>
                        {r.authorName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Write a review */}
          <div style={{ borderTop: "1px solid var(--sio-line)", paddingTop: 24, maxWidth: 520 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sio-muted)" }}>
              Write a Review
            </h3>
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
                    <svg width={24} height={24} viewBox="0 0 24 24" fill={star <= reviewForm.rating ? "var(--sio-bronze)" : "var(--sio-line)"}>
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
                className="sio-btn-primary sio-shine-btn"
                style={{ padding: "13px 22px", border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", alignSelf: "flex-start" }}
              >
                {submittingReview ? "Submitting…" : "Submit Review"}
              </button>
              {reviewSubmitted && (
                <span className="sio-fade-in" style={{ color: "var(--sio-bronze-dark)", fontSize: 13 }}>
                  Thanks for your review.
                </span>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Similar products */}
      {similar.length > 0 && (
        <section className="sio-fade-in" style={{ animationDelay: "330ms" }}>
          <SectionHeading>You Might Also Like</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 24, marginTop: 20 }}>
            {similar.map((p, i) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="sio-card sio-fade-in"
                style={{ textDecoration: "none", color: "inherit", border: "1px solid var(--sio-line)", background: "#fff", animationDelay: `${i * 60}ms` }}
              >
                <div className="sio-zoom-hover">
                  <img src={p.images?.[0]?.url} alt={p.title} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "var(--sio-muted)", marginTop: 3, letterSpacing: "0.02em" }}>{p.storeName}</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontWeight: 600 }}>₹{p.basePrice}</span>
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 20,
        fontWeight: 600,
        paddingBottom: 14,
        borderBottom: "1px solid var(--sio-line)",
      }}
    >
      {children}
    </h2>
  );
}

function qtyBtnStyle(): React.CSSProperties {
  return { width: 40, height: 40, border: "none", background: "#fff", fontSize: 16, cursor: "pointer", color: "var(--sio-ink)" };
}

function reviewInputStyle(): React.CSSProperties {
  return { padding: "11px 12px", border: "1px solid var(--sio-line)", fontSize: 14 };
}

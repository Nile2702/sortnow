"use client";

import { useEffect, useState } from "react";

interface StoreReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Summary {
  average: number;
  count: number;
  breakdown: { star: number; count: number }[];
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

function inputStyle(): React.CSSProperties {
  return { padding: "11px 12px", border: "1px solid var(--sio-line)", borderRadius: 10, fontSize: 14, fontFamily: "inherit" };
}

// A shopper rating the shop itself (service, authenticity, how the
// pickup/reservation experience went) - distinct from rating any one
// product, which the product detail page already covers. Theme-neutral
// (no --store-primary/--store-accent) like StoreRatingBadge, so it reads
// consistently as an independent signal across differently-branded stores.
export function StoreReviews({ storeId }: { storeId: string }) {
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [summary, setSummary] = useState<Summary>({ average: 0, count: 0, breakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })) });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ authorName: "", rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/stores/${storeId}/reviews`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews);
        setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/v1/stores/${storeId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newReview = await res.json();
      setReviews((r) => [newReview, ...r]);
      setSummary((s) => ({
        average: Math.round(((s.average * s.count + newReview.rating) / (s.count + 1)) * 10) / 10,
        count: s.count + 1,
        breakdown: s.breakdown.map((b) => (b.star === newReview.rating ? { ...b, count: b.count + 1 } : b)),
      }));
      setForm({ authorName: "", rating: 5, comment: "" });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
    setSubmitting(false);
  }

  if (loading) return null;

  return (
    <div
      style={{
        maxWidth: 1440,
        margin: "0 auto",
        padding: "0 16px 40px",
      }}
    >
      <div style={{ background: "var(--sio-paper, #fff)", border: "1px solid var(--sio-line)", borderRadius: 16, padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Rate This Shop</h2>

        <div className="sio-two-col-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 600, fontFamily: "var(--site-font-heading)" }}>{summary.average || "—"}</div>
            <Stars rating={summary.average} size={16} />
            <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 6 }}>
              {summary.count} review{summary.count !== 1 ? "s" : ""}
            </div>
          </div>

          <div>
            {reviews.length === 0 ? (
              <p style={{ color: "var(--sio-muted)", fontSize: 14 }}>No shop reviews yet — be the first to share your experience.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {reviews.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ borderBottom: "1px solid var(--sio-line)", paddingBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Stars rating={r.rating} />
                    </div>
                    <p style={{ fontSize: 14, color: "var(--sio-ink-soft)", marginBottom: 6, lineHeight: 1.6 }}>{r.comment}</p>
                    <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>
                      {r.authorName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--sio-line)", paddingTop: 20, maxWidth: 480 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sio-muted)" }}>
            Write a Review
          </h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rating: star }))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  aria-label={`Rate ${star} stars`}
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill={star <= form.rating ? "var(--sio-bronze)" : "var(--sio-line)"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            <input
              required
              value={form.authorName}
              onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
              placeholder="Your name"
              style={inputStyle()}
            />
            <textarea
              required
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Share your experience shopping at this store…"
              rows={3}
              style={{ ...inputStyle(), resize: "vertical" }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "12px 20px",
                borderRadius: 999,
                border: "none",
                background: "var(--sio-ink)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: submitting ? "default" : "pointer",
                alignSelf: "flex-start",
              }}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
            {submitted && (
              <span className="sio-fade-in" style={{ color: "var(--sio-bronze-dark)", fontSize: 13 }}>
                Thanks for rating this shop.
              </span>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

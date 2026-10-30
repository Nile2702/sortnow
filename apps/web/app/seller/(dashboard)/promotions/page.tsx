"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { LoadingScreen } from "../../../../components/LoadingSpinner";
import { showToast } from "../../../../lib/toast";
import { CATEGORY_TREE } from "../../../../lib/catalog-constants";

interface Product {
  id: string;
  title: string;
  basePrice: number;
  images: { url: string }[];
  gender: string;
  subCategory: string;
}

interface SaleCampaign {
  id: string;
  name: string;
  discountType: "percent" | "flat";
  discountValue: number;
  scope: "all" | "category" | "products";
  gender?: string;
  subCategory?: string;
  productIds?: string[];
  startsAt: string;
  endsAt: string;
}

type Scope = "all" | "category" | "products";

function campaignStatus(c: SaleCampaign): "upcoming" | "active" | "ended" {
  const now = Date.now();
  if (new Date(c.startsAt).getTime() > now) return "upcoming";
  if (new Date(c.endsAt).getTime() <= now) return "ended";
  return "active";
}

function describeScope(c: SaleCampaign): string {
  if (c.scope === "all") return "All products";
  if (c.scope === "category") return `${c.subCategory} (${c.gender})`;
  return `${c.productIds?.length ?? 0} handpicked product${c.productIds?.length === 1 ? "" : "s"}`;
}

// A real, scoped discount a seller runs for a window of time - unlike the
// dashboard's "Start a Live Sale" (a purely cosmetic storefront badge), this
// actually changes what shoppers pay: the discount is computed live on
// every shopper-facing price (search, category, store page, product detail)
// for however long the campaign runs, then reverts automatically. See
// lib/seed-data.ts applyActiveSales() and its comment for how that works
// without ever touching the product's own stored price.
export default function PromotionsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [campaigns, setCampaigns] = useState<SaleCampaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState("20");
  const [scope, setScope] = useState<Scope>("all");
  const [gender, setGender] = useState<string>(CATEGORY_TREE[0]?.value ?? "women");
  const [subCategory, setSubCategory] = useState(CATEGORY_TREE[0]?.subCategories[0] ?? "");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [scheduleStart, setScheduleStart] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subCategoryOptions = CATEGORY_TREE.find((c) => c.value === gender)?.subCategories ?? [];

  useEffect(() => {
    if (!store) return;
    Promise.all([
      fetch(`/api/v1/seller/stores/${store.id}/sale-campaigns`).then((r) => r.json()),
      fetch(`/api/v1/seller/stores/${store.id}/products`).then((r) => r.json()),
    ])
      .then(([c, p]) => {
        setCampaigns(c);
        setProducts(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [store]);

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setError("");
    if (!endsAt) {
      setError("Pick an end date/time.");
      return;
    }
    if (scope === "products" && selectedProductIds.size === 0) {
      setError("Pick at least one product.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/sale-campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "Sale",
        discountType,
        discountValue: Number(discountValue),
        scope,
        gender: scope === "category" ? gender : undefined,
        subCategory: scope === "category" ? subCategory : undefined,
        productIds: scope === "products" ? [...selectedProductIds] : undefined,
        startsAt: scheduleStart && startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: new Date(endsAt).toISOString(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Couldn't create that campaign.");
      return;
    }
    const created = await res.json();
    setCampaigns((prev) => [created, ...prev]);
    setName("");
    setSelectedProductIds(new Set());
    setStartsAt("");
    setEndsAt("");
    showToast("Sale campaign created");
  }

  async function handleCancel(id: string) {
    if (!store) return;
    setCancellingId(id);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/sale-campaigns/${id}`, { method: "DELETE" });
    setCancellingId(null);
    if (!res.ok) {
      showToast("Couldn't end that campaign", "error");
      return;
    }
    // Re-fetch rather than patch local state - a cancelled campaign's own
    // status (ended now vs. deleted outright if it hadn't started) depends
    // on server-side logic (cancelSaleCampaign), simplest to just trust the
    // server's fresh list rather than guess it client-side.
    const refreshed = await fetch(`/api/v1/seller/stores/${store.id}/sale-campaigns`).then((r) => r.json());
    setCampaigns(refreshed);
    showToast("Campaign ended");
  }

  if (storeLoading || !store || loading) {
    return <LoadingScreen maxWidth={900} />;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Promotions</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28 }}>
        Run a real, timed discount on part of your catalog — shoppers see the cut price everywhere (search, your storefront, product
        pages) for as long as it runs, then it reverts on its own. This doesn't change your stored prices.
      </p>

      <form
        onSubmit={handleSubmit}
        className="sio-card"
        style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24, marginBottom: 32, display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Festive Weekend Sale"
            maxLength={120}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
          />
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Discount</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "flat")}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
              >
                <option value="percent">% off</option>
                <option value="flat">₹ off</option>
              </select>
              <input
                type="number"
                min={1}
                max={discountType === "percent" ? 90 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                style={{ width: 100, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
              />
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Applies to</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {(["all", "category", "products"] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: scope === s ? "2px solid var(--sio-ink)" : "1px solid var(--sio-line)",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {s === "all" ? "All products" : s === "category" ? "One category" : "Handpicked products"}
              </button>
            ))}
          </div>

          {scope === "category" && (
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={gender}
                onChange={(e) => {
                  const g = e.target.value;
                  setGender(g);
                  setSubCategory(CATEGORY_TREE.find((c) => c.value === g)?.subCategories[0] ?? "");
                }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
              >
                {CATEGORY_TREE.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
              >
                {subCategoryOptions.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "products" && (
            <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--sio-cream)", borderRadius: 10 }}>
              {products.length === 0 ? (
                <div style={{ padding: 14, fontSize: 13, color: "var(--sio-muted)" }}>No products yet.</div>
              ) : (
                products.map((p) => (
                  <label
                    key={p.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--sio-cream)", fontSize: 13, cursor: "pointer" }}
                  >
                    <input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => toggleProduct(p.id)} />
                    {p.images?.[0]?.url && (
                      <img src={p.images[0].url} alt="" style={{ width: 32, height: 40, objectFit: "cover", borderRadius: 4 }} />
                    )}
                    <span style={{ flex: 1 }}>{p.title}</span>
                    <span style={{ color: "var(--sio-muted)" }}>₹{p.basePrice.toLocaleString("en-IN")}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={scheduleStart} onChange={(e) => setScheduleStart(e.target.checked)} />
              Schedule a start (otherwise starts now)
            </label>
            {scheduleStart && (
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
              />
            )}
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Ends</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
            />
          </div>
        </div>

        {error && <div style={{ color: "var(--sio-error)", fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            alignSelf: "flex-start",
            padding: "10px 22px",
            borderRadius: 999,
            border: "none",
            background: "var(--sio-ink)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Starting…" : "Start campaign"}
        </button>
      </form>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Your campaigns</h2>
      {campaigns.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>No campaigns yet — set one up above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.map((c) => {
            const status = campaignStatus(c);
            const badge =
              status === "active"
                ? { label: "Live", bg: "var(--sio-success-bg)", fg: "var(--sio-success)" }
                : status === "upcoming"
                ? { label: "Scheduled", bg: "var(--sio-info-bg)", fg: "var(--sio-info)" }
                : { label: "Ended", bg: "var(--sio-cream)", fg: "var(--sio-muted)" };
            return (
              <div
                key={c.id}
                className="sio-card"
                style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 16, display: "flex", alignItems: "center", gap: 14 }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: badge.bg, color: badge.fg, flexShrink: 0 }}>
                  {badge.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--sio-muted)" }}>
                    {c.discountType === "percent" ? `${c.discountValue}% off` : `₹${c.discountValue} off`} · {describeScope(c)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--sio-muted)" }}>
                    {new Date(c.startsAt).toLocaleString("en-IN")} → {new Date(c.endsAt).toLocaleString("en-IN")}
                  </div>
                </div>
                {status !== "ended" && (
                  <button
                    onClick={() => handleCancel(c.id)}
                    disabled={cancellingId === c.id}
                    style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid var(--sio-line)", background: "#fff", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
                  >
                    {cancellingId === c.id ? "Ending…" : "End now"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

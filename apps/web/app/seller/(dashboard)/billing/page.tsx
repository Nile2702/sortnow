"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { LoadingScreen } from "../../../../components/LoadingSpinner";

interface Plan {
  code: string;
  name: string;
  skuBand: string;
  skuLimit: number | null;
  monthlyPrice: number;
  perListingPrice: number;
}

interface Invoice {
  id: string;
  taxableValue: number;
  placeOfSupplyStateCode: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  issuedAt: string;
}

interface FreeTrial {
  active: boolean;
  months: number;
  endsAt: string | null;
}

interface BillingData {
  subscription: { planCode: string; status: string; currentPeriodEnd: string };
  invoices: Invoice[];
  skuCount: number;
  plans: Plan[];
  freeTrial: FreeTrial;
}

interface BoostPackage {
  days: number;
  price: number;
  label: string;
}

interface BoostData {
  boostedUntil: string | null;
  packages: BoostPackage[];
}

export default function BillingPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<BillingData | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [boost, setBoost] = useState<BoostData | null>(null);
  const [boosting, setBoosting] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Without the .catch() on each of these, a dropped/failed request was an
  // unhandled rejection - data/boost stayed null forever and this page was
  // stuck on "Loading…" permanently with no error and no way to retry.
  function load(storeId: string) {
    setLoadError(false);
    fetch(`/api/v1/seller/stores/${storeId}/billing`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(() => setLoadError(true));
    fetch(`/api/v1/seller/stores/${storeId}/boost`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setBoost)
      .catch(() => setLoadError(true));
  }

  useEffect(() => {
    if (store) load(store.id);
  }, [store]);

  async function handleSwitch(planCode: string) {
    if (!store) return;
    setSwitching(planCode);
    await fetch(`/api/v1/seller/stores/${store.id}/billing/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode }),
    });
    load(store.id);
    setSwitching(null);
  }

  async function handleBoost(days: number) {
    if (!store) return;
    setBoosting(days);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/boost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    const result = await res.json().catch(() => null);
    if (result) setBoost((b) => (b ? { ...b, boostedUntil: result.boostedUntil } : b));
    setBoosting(null);
  }

  if (loadError) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load billing details.</p>
        <button
          onClick={() => store && load(store.id)}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </main>
    );
  }

  if (storeLoading || !store || !data || !boost) {
    return <LoadingScreen maxWidth={1000} />;
  }

  const boostActive = !!boost.boostedUntil && new Date(boost.boostedUntil).getTime() > Date.now();

  const currentPlan = data.plans.find((p) => p.code === data.subscription.planCode)!;
  const usagePct = currentPlan.skuLimit ? Math.min(100, Math.round((data.skuCount / currentPlan.skuLimit) * 100)) : null;
  const { freeTrial } = data;
  // What the seller's current plan would have cost for the full free
  // window - the headline savings figure, not a pro-rated "days left"
  // amount, since the ask here is "how much free are we offering" at a
  // glance, not a precise remaining-value calculator.
  const freeTrialValue = currentPlan.monthlyPrice * freeTrial.months;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Billing & Subscription</h1>
      <p style={{ color: "#64748b", marginBottom: 4 }}>{store.name}</p>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 28 }}>
        No real payment is processed yet - switching plans or boosting your store here doesn't charge a card. A real payment gateway
        (Razorpay/Cashfree) will be added before this goes live for real transactions, same as AI photo credits.
      </p>

      {freeTrial.active && freeTrial.endsAt && (
        <div
          className="sio-card"
          style={{
            background: "linear-gradient(135deg, #16a34a, #15803d)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 28,
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.85, marginBottom: 6 }}>
            🎉 Launch offer — free for your first {freeTrial.months} months
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>You're saving ₹{freeTrialValue.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {currentPlan.name} is free until {new Date(freeTrial.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} —
            switch plans anytime before then at no cost.
          </div>
        </div>
      )}

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Current Plan</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{currentPlan.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: freeTrial.active ? "#dcfce7" : data.subscription.status === "active" ? "#dcfce7" : "#fef3c7",
                color: freeTrial.active ? "#16a34a" : data.subscription.status === "active" ? "#16a34a" : "#b45309",
                textTransform: "capitalize",
              }}
            >
              {freeTrial.active ? "Free Trial" : data.subscription.status}
            </span>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              {freeTrial.active && freeTrial.endsAt
                ? `Free until ${new Date(freeTrial.endsAt).toLocaleDateString("en-IN")}`
                : `Renews ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-IN")}`}
            </div>
          </div>
        </div>

        {usagePct !== null ? (
          <>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
              SKU usage: {data.skuCount} / {currentPlan.skuLimit}
            </div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${usagePct}%`, background: usagePct > 90 ? "#e11d48" : "#0f172a", borderRadius: 999 }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#64748b" }}>{data.skuCount.toLocaleString("en-IN")} SKUs listed — no cap on this plan</div>
        )}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Plans</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {data.plans.map((plan) => {
          const isCurrent = plan.code === currentPlan.code;
          return (
            <div
              key={plan.code}
              className="sio-card"
              style={{
                background: "#fff",
                borderRadius: 16,
                border: isCurrent ? "2px solid #0f172a" : "1px solid #f1f5f9",
                padding: 22,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>
              {plan.monthlyPrice > 0 ? (
                freeTrial.active ? (
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#16a34a" }}>
                    ₹0<span style={{ fontSize: 13, fontWeight: 400 }}>/mo</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: "#94a3b8", textDecoration: "line-through", marginLeft: 8 }}>
                      ₹{plan.monthlyPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                    ₹{plan.monthlyPrice.toLocaleString("en-IN")}
                    <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>/mo</span>
                  </div>
                )
              ) : (
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#64748b" }}>No monthly fee</div>
              )}
              <div style={{ fontSize: 13, marginBottom: 2 }}>
                {freeTrial.active ? (
                  <>
                    <span style={{ fontWeight: 700, color: "#16a34a" }}>₹0.00</span>{" "}
                    <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>₹{plan.perListingPrice.toFixed(2)}</span>
                    <span style={{ color: "#94a3b8" }}> /listing</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 700 }}>₹{plan.perListingPrice.toFixed(2)}</span>
                    <span style={{ color: "#94a3b8" }}>{plan.monthlyPrice > 0 ? " /listing at max capacity" : " /listing"}</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 18 }}>{plan.skuBand} SKUs</div>
              <button
                onClick={() => handleSwitch(plan.code)}
                disabled={isCurrent || switching === plan.code}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 999,
                  border: "none",
                  background: isCurrent ? "#f1f5f9" : "#0f172a",
                  color: isCurrent ? "#94a3b8" : "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isCurrent ? "default" : "pointer",
                }}
              >
                {isCurrent ? "Current Plan" : switching === plan.code ? "Switching…" : "Switch Plan"}
              </button>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Boost Your Store</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
        Rank first in "Stores near you" and on /shops for a fixed window — the more shoppers see your store, the more that traffic is worth.
      </p>
      <div
        className="sio-card"
        style={{
          background: "#fff",
          borderRadius: 16,
          border: boostActive ? "2px solid #d97706" : "1px solid #f1f5f9",
          padding: 22,
          marginBottom: 32,
        }}
      >
        {boostActive ? (
          <div style={{ marginBottom: 16 }}>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#fef3c7", color: "#b45309" }}>
              ⚡ Featured
            </span>
            <span style={{ marginLeft: 10, fontSize: 13, color: "#64748b" }}>
              Active until {new Date(boost.boostedUntil!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Not currently boosted.</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          {boost.packages.map((pkg) => (
            <div key={pkg.days} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{pkg.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0" }}>₹{pkg.price.toLocaleString("en-IN")}</div>
              <button
                onClick={() => handleBoost(pkg.days)}
                disabled={boosting === pkg.days}
                style={{
                  width: "100%",
                  padding: "9px",
                  borderRadius: 999,
                  border: "none",
                  background: "#d97706",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: boosting === pkg.days ? "default" : "pointer",
                  opacity: boosting === pkg.days ? 0.7 : 1,
                }}
              >
                {boosting === pkg.days ? "Applying…" : boostActive ? "Extend" : "Boost"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>GST Invoices</h2>
      {freeTrial.active ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, fontSize: 13, color: "#64748b" }}>
          Nothing to invoice yet — you're in your free {freeTrial.months}-month launch period, so there's been no billing to generate a GST
          invoice for.
        </div>
      ) : (
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "12px 18px", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
          <div>Invoice</div>
          <div>Taxable Value</div>
          <div>Tax</div>
          <div>Total</div>
          <div>Date</div>
        </div>
        {data.invoices.map((inv) => {
          const taxLabel =
            inv.igst > 0
              ? `IGST ₹${inv.igst.toLocaleString("en-IN")}`
              : `CGST ₹${inv.cgst.toLocaleString("en-IN")} + SGST ₹${inv.sgst.toLocaleString("en-IN")}`;
          return (
            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "14px 18px", fontSize: 13, borderBottom: "1px solid #f8fafc" }}>
              <div style={{ fontWeight: 600 }}>{inv.id}</div>
              <div>₹{inv.taxableValue.toLocaleString("en-IN")}</div>
              <div>{taxLabel}</div>
              <div style={{ fontWeight: 700 }}>₹{inv.total.toLocaleString("en-IN")}</div>
              <div style={{ color: "#64748b" }}>{new Date(inv.issuedAt).toLocaleDateString("en-IN")}</div>
            </div>
          );
        })}
      </div>
      )}
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
        Tax split follows the platform's registered state (Maharashtra, code 27) vs. the merchant's state-of-supply, per{" "}
        <code>fn_compute_gst_split()</code> in <code>database/schema.sql</code>.
      </p>
    </main>
  );
}

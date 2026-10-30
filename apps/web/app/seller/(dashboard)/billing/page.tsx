"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { LoadingScreen } from "../../../../components/LoadingSpinner";
import { showToast } from "../../../../lib/toast";

// Hidden for the pilot - paid storefront ranking isn't something to sell
// sellers on yet at this stage. The feature itself (API routes, DB column,
// handleBoost below) is untouched, just not shown here; flip back to true
// to bring the section back.
const SHOW_BOOST = false;

interface Plan {
  code: string;
  name: string;
  skuBand: string;
  includedSkus: number;
  monthlyPrice: number;
  perListingPrice: number;
  overagePrice: number | null;
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
  estimatedMonthlyCost: number;
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
  const router = useRouter();
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<BillingData | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [boost, setBoost] = useState<BoostData | null>(null);
  const [boosting, setBoosting] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

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

  async function handleCloseStore() {
    if (!store) return;
    setClosing(true);
    setCloseError("");
    const res = await fetch(`/api/v1/seller/stores/${store.id}/close`, { method: "POST" });
    setClosing(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCloseError(body.message ?? "Couldn't close the store.");
      return;
    }
    showToast("Your store is now closed");
    router.push("/seller");
    router.refresh();
  }

  if (loadError) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load billing details.</p>
        <button
          onClick={() => store && load(store.id)}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, cursor: "pointer" }}
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
  // Flex has nothing "included" to show a quota bar against (every SKU is
  // billed), so it gets its own usage readout below instead of this bar.
  const usagePct = currentPlan.includedSkus > 0 ? Math.min(100, Math.round((data.skuCount / currentPlan.includedSkus) * 100)) : null;
  const overageSkus = currentPlan.overagePrice != null ? Math.max(0, data.skuCount - currentPlan.includedSkus) : 0;
  const { freeTrial } = data;
  // What the seller's current plan would have cost for the full free
  // window - the headline savings figure, not a pro-rated "days left"
  // amount, since the ask here is "how much free are we offering" at a
  // glance, not a precise remaining-value calculator. Uses just the flat
  // fee, not any projected overage, since that depends on SKU growth no
  // one can predict 6 months out.
  const freeTrialValue = currentPlan.monthlyPrice * freeTrial.months;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Billing & Subscription</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 4 }}>{store.name}</p>
      <p style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 28 }}>
        No real payment is processed yet - switching plans or boosting your store here doesn't charge a card. A real payment gateway
        (Razorpay/Cashfree) will be added before this goes live for real transactions, same as AI photo credits.
      </p>

      {freeTrial.active && freeTrial.endsAt && (
        <div
          className="sio-card"
          style={{
            background: "linear-gradient(135deg, var(--sio-success), #15803d)",
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
            {currentPlan.name}'s monthly fee is free until{" "}
            {new Date(freeTrial.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} — switch plans anytime before
            then at no cost.
            {currentPlan.overagePrice != null && currentPlan.includedSkus > 0
              ? ` Extra listings past ${currentPlan.includedSkus.toLocaleString("en-IN")} SKUs are still billed as usual.`
              : ""}
          </div>
        </div>
      )}

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--sio-muted)" }}>Current Plan</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{currentPlan.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: freeTrial.active ? "var(--sio-success-bg)" : data.subscription.status === "active" ? "var(--sio-success-bg)" : "var(--sio-pending-bg)",
                color: freeTrial.active ? "var(--sio-success)" : data.subscription.status === "active" ? "var(--sio-success)" : "var(--sio-pending)",
                textTransform: "capitalize",
              }}
            >
              {freeTrial.active ? "Free Trial" : data.subscription.status}
            </span>
            <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 4 }}>
              {freeTrial.active && freeTrial.endsAt
                ? `Free until ${new Date(freeTrial.endsAt).toLocaleDateString("en-IN")}`
                : `Renews ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-IN")}`}
            </div>
          </div>
        </div>

        {usagePct !== null ? (
          <>
            <div style={{ fontSize: 13, color: "var(--sio-muted)", marginBottom: 6 }}>
              SKU usage: {data.skuCount.toLocaleString("en-IN")} / {currentPlan.includedSkus.toLocaleString("en-IN")} included
              {overageSkus > 0 && (
                <span style={{ color: "var(--sio-pending)", fontWeight: 600 }}>
                  {" "}
                  (+{overageSkus.toLocaleString("en-IN")} extra at ₹{(currentPlan.overagePrice ?? 0).toFixed(2)} each)
                </span>
              )}
            </div>
            <div style={{ height: 8, background: "var(--sio-cream)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${usagePct}%`, background: usagePct > 90 ? "var(--sio-error)" : "var(--sio-ink)", borderRadius: 999 }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--sio-muted)" }}>
            {data.skuCount.toLocaleString("en-IN")} SKUs listed × ₹{currentPlan.perListingPrice.toFixed(2)} each — no monthly fee on this plan
          </div>
        )}

        {/* Shown even during the free trial - it only waives the flat
            monthly fee, so this can be non-zero for a Max store that's
            listed past its included 2,000 SKUs. */}
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--sio-cream)" }}>
          Estimated this month: ₹{data.estimatedMonthlyCost.toLocaleString("en-IN")}
          {freeTrial.active && data.estimatedMonthlyCost > 0 && (
            <span style={{ fontWeight: 400, color: "var(--sio-muted)" }}> (extra-listing charges only — your monthly fee is free)</span>
          )}
        </div>
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
                border: isCurrent ? "2px solid var(--sio-ink)" : "1px solid var(--sio-cream)",
                padding: 22,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>

              {plan.monthlyPrice > 0 ? (
                // Pro/Max: a real flat monthly fee - the headline number.
                freeTrial.active ? (
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "var(--sio-success)" }}>
                    ₹0<span style={{ fontSize: 13, fontWeight: 400 }}>/mo</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--sio-muted)", textDecoration: "line-through", marginLeft: 8 }}>
                      ₹{plan.monthlyPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                    ₹{plan.monthlyPrice.toLocaleString("en-IN")}
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--sio-muted)" }}>/mo</span>
                  </div>
                )
              ) : (
                // Flex: no flat fee to waive during the trial - every
                // listing is a real, metered charge from the first SKU,
                // same with or without an active trial.
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                  ₹{plan.perListingPrice.toFixed(2)}
                  <span style={{ fontSize: 13, fontWeight: 400, color: "var(--sio-muted)" }}>/listing</span>
                </div>
              )}

              {plan.monthlyPrice > 0 && (
                <div style={{ fontSize: 12.5, color: "var(--sio-muted)", marginBottom: 2 }}>
                  {/* perListingPrice here is always reference math only
                      ("what that works out to per SKU if fully used") -
                      never an actual charge on its own, for either plan.
                      overagePrice (Max only) is the real, billed rate past
                      includedSkus - still applies during the free trial,
                      which only waives the flat monthly fee above. */}
                  {plan.skuBand} SKUs, one flat fee (≈₹{plan.perListingPrice.toFixed(2)}/listing if fully used)
                  {plan.overagePrice != null && (
                    <>
                      ; above {plan.includedSkus.toLocaleString("en-IN")}, each extra listing is ₹{plan.overagePrice.toFixed(2)}
                    </>
                  )}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 18 }}>{plan.monthlyPrice === 0 ? `${plan.skuBand} SKUs — no monthly fee` : " "}</div>
              <button
                onClick={() => handleSwitch(plan.code)}
                disabled={isCurrent || switching === plan.code}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 999,
                  border: "none",
                  background: isCurrent ? "var(--sio-cream)" : "var(--sio-ink)",
                  color: isCurrent ? "var(--sio-muted)" : "#fff",
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

      {SHOW_BOOST && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Boost Your Store</h2>
          <p style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 14 }}>
            Rank first in "Stores near you" and on /shops for a fixed window — the more shoppers see your store, the more that traffic is worth.
          </p>
          <div
            className="sio-card"
            style={{
              background: "#fff",
              borderRadius: 16,
              border: boostActive ? "2px solid var(--sio-pending)" : "1px solid var(--sio-cream)",
              padding: 22,
              marginBottom: 32,
            }}
          >
            {boostActive ? (
              <div style={{ marginBottom: 16 }}>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "var(--sio-pending-bg)", color: "var(--sio-pending)" }}>
                  ⚡ Featured
                </span>
                <span style={{ marginLeft: 10, fontSize: 13, color: "var(--sio-muted)" }}>
                  Active until {new Date(boost.boostedUntil!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--sio-muted)", marginBottom: 16 }}>Not currently boosted.</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {boost.packages.map((pkg) => (
                <div key={pkg.days} style={{ border: "1px solid var(--sio-cream)", borderRadius: 12, padding: 16, textAlign: "center" }}>
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
                      background: "var(--sio-pending)",
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
        </>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>GST Invoices</h2>
      {freeTrial.active ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--sio-cream)", padding: 20, fontSize: 13, color: "var(--sio-muted)" }}>
          Nothing to invoice yet — you're in your free {freeTrial.months}-month launch period, so there's been no billing to generate a GST
          invoice for.
        </div>
      ) : (
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid var(--sio-cream)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "12px 18px", fontSize: 12, fontWeight: 700, color: "var(--sio-muted)", borderBottom: "1px solid var(--sio-cream)" }}>
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
            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "14px 18px", fontSize: 13, borderBottom: "1px solid var(--sio-cream)" }}>
              <div style={{ fontWeight: 600 }}>{inv.id}</div>
              <div>₹{inv.taxableValue.toLocaleString("en-IN")}</div>
              <div>{taxLabel}</div>
              <div style={{ fontWeight: 700 }}>₹{inv.total.toLocaleString("en-IN")}</div>
              <div style={{ color: "var(--sio-muted)" }}>{new Date(inv.issuedAt).toLocaleDateString("en-IN")}</div>
            </div>
          );
        })}
      </div>
      )}
      <p style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 10 }}>
        Tax split follows the platform's registered state (Maharashtra, code 27) vs. the merchant's state-of-supply, per{" "}
        <code>fn_compute_gst_split()</code> in <code>database/schema.sql</code>.
      </p>

      {store.status === "active" && (
        <div
          className="sio-card"
          style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-error-border)", padding: 24, marginTop: 40 }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--sio-error)" }}>Danger Zone</h2>
          <p style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 16 }}>
            Closing your store takes it down everywhere shoppers see it — search, the shop directory, and your own storefront link —
            right away. Nothing is deleted; your products and past data stay exactly as they are, just hidden. Reopening isn't
            self-service after that — you'll need to contact support.
          </p>

          {!confirmingClose ? (
            <button
              onClick={() => setConfirmingClose(true)}
              style={{ padding: "10px 20px", borderRadius: 999, border: "1px solid var(--sio-error-border)", background: "#fff", color: "var(--sio-error)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Close My Store
            </button>
          ) : (
            <div style={{ background: "var(--sio-error-bg)", border: "1px solid var(--sio-error-border)", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                Are you sure you want to close {store.name}? Shoppers won't be able to find or reserve from it anymore.
              </p>
              {closeError && <p style={{ fontSize: 13, color: "var(--sio-error)", marginBottom: 12 }}>{closeError}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleCloseStore}
                  disabled={closing}
                  style={{ padding: "9px 18px", borderRadius: 999, border: "none", background: "var(--sio-error)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: closing ? "default" : "pointer", opacity: closing ? 0.7 : 1 }}
                >
                  {closing ? "Closing…" : "Yes, close my store"}
                </button>
                <button
                  onClick={() => {
                    setConfirmingClose(false);
                    setCloseError("");
                  }}
                  disabled={closing}
                  style={{ padding: "9px 18px", borderRadius: 999, border: "1px solid var(--sio-line)", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

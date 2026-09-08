"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../lib/use-seller-store";

interface Plan {
  code: string;
  name: string;
  skuLimit: number;
  monthlyPrice: number;
  features: string[];
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

interface BillingData {
  subscription: { planCode: string; status: string; currentPeriodEnd: string };
  invoices: Invoice[];
  skuCount: number;
  plans: Plan[];
}

export default function BillingPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<BillingData | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  function load(storeId: string) {
    fetch(`/api/v1/seller/stores/${storeId}/billing`)
      .then((r) => r.json())
      .then(setData);
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

  if (storeLoading || !store || !data) {
    return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const currentPlan = data.plans.find((p) => p.code === data.subscription.planCode)!;
  const usagePct = Math.min(100, Math.round((data.skuCount / currentPlan.skuLimit) * 100));

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Billing & Subscription</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>{store.name}</p>

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
                background: data.subscription.status === "active" ? "#dcfce7" : "#fef3c7",
                color: data.subscription.status === "active" ? "#16a34a" : "#b45309",
                textTransform: "capitalize",
              }}
            >
              {data.subscription.status}
            </span>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
          SKU usage: {data.skuCount} / {currentPlan.skuLimit}
        </div>
        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${usagePct}%`, background: usagePct > 90 ? "#e11d48" : "#0f172a", borderRadius: 999 }} />
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
                border: isCurrent ? "2px solid #0f172a" : "1px solid #f1f5f9",
                padding: 22,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                ₹{plan.monthlyPrice}
                <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>Up to {plan.skuLimit.toLocaleString("en-IN")} SKUs</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, color: "#475569", marginBottom: 18 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ marginBottom: 6 }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
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

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>GST Invoices</h2>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "12px 18px", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
          <div>Invoice</div>
          <div>Taxable Value</div>
          <div>Tax</div>
          <div>Total</div>
          <div>Date</div>
        </div>
        {data.invoices.map((inv) => {
          const taxLabel = inv.igst > 0 ? `IGST ₹${inv.igst}` : `CGST ₹${inv.cgst} + SGST ₹${inv.sgst}`;
          return (
            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "14px 18px", fontSize: 13, borderBottom: "1px solid #f8fafc" }}>
              <div style={{ fontWeight: 600 }}>{inv.id}</div>
              <div>₹{inv.taxableValue}</div>
              <div>{taxLabel}</div>
              <div style={{ fontWeight: 700 }}>₹{inv.total}</div>
              <div style={{ color: "#64748b" }}>{new Date(inv.issuedAt).toLocaleDateString("en-IN")}</div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
        Tax split follows the platform's registered state (Maharashtra, code 27) vs. the merchant's state-of-supply, per{" "}
        <code>fn_compute_gst_split()</code> in <code>database/schema.sql</code>.
      </p>
    </main>
  );
}

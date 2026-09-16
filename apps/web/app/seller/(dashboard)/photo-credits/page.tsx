"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { showToast } from "../../../../lib/toast";

interface CreditPackage {
  id: string;
  credits: number;
  priceInr: number;
}

interface CreditsData {
  balance: number;
  packages: CreditPackage[];
}

export default function PhotoCreditsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<CreditsData | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  function load(storeId: string) {
    fetch(`/api/v1/seller/stores/${storeId}/photo-credits`)
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    if (store) load(store.id);
  }, [store]);

  async function handleBuy(packageId: string) {
    if (!store) return;
    setBuying(packageId);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/photo-credits/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    setBuying(null);
    if (!res.ok) {
      showToast("Couldn't complete the purchase. Try again.");
      return;
    }
    const result = await res.json();
    setData((d) => (d ? { ...d, balance: result.balance } : d));
    showToast("Credits added — ready to use.", "success");
  }

  if (storeLoading || !store || !data) {
    return <main style={{ maxWidth: 900, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>AI Photo Credits</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        Used by the <strong>Enhance with AI</strong> step in your product photos — background removal is always free; adding a mannequin with
        Gemini costs 1 credit per photo.
      </p>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>Current balance</div>
        <div style={{ fontSize: 36, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 8 }}>
          {data.balance}
          <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b" }}>credit{data.balance === 1 ? "" : "s"}</span>
        </div>
        {data.balance === 0 && (
          <p style={{ fontSize: 13, color: "#dc2626", marginTop: 8 }}>You're out of credits — buy a pack below to keep using AI mannequin placement.</p>
        )}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Buy credits</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {data.packages.map((pack) => (
          <div key={pack.id} className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 22, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 2 }}>{pack.credits}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>credits</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>₹{pack.priceInr}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 18 }}>≈ ₹{(pack.priceInr / pack.credits).toFixed(1)} / photo</div>
            <button
              onClick={() => handleBuy(pack.id)}
              disabled={buying === pack.id}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 999,
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: buying === pack.id ? "default" : "pointer",
              }}
            >
              {buying === pack.id ? "Processing…" : "Buy"}
            </button>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8" }}>
        This is a demo purchase flow — no real payment is processed. A real deployment would redirect to Razorpay/Cashfree checkout here (see{" "}
        <code>docs/04-monetization-and-billing.md</code>), the same as plan subscriptions under Billing.
      </p>
    </main>
  );
}

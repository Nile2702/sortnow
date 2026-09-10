"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";

interface Analytics {
  totalPageViews: number;
  totalQrScans: number;
  onlineViews: number;
  byPosition: Record<string, number>;
  last7Days: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/analytics`)
      .then((r) => r.json())
      .then(setData);
  }, [store]);

  if (storeLoading || !store || !data) {
    return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const maxDay = Math.max(1, ...data.last7Days.map((d) => d.count));

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        {store.name} · footfall attribution across online discovery and QR standees (docs/03-multi-tenant-storefront.md §4)
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Page Views", value: data.totalPageViews, icon: "👁️" },
          { label: "Online Discovery", value: data.onlineViews, icon: "🔍" },
          { label: "QR Scans", value: data.totalQrScans, icon: "📱" },
        ].map((s) => (
          <div key={s.label} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Views — last 7 days</h2>
      <div className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
          {data.last7Days.map((d) => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{d.count}</div>
              <div
                style={{
                  width: "100%",
                  height: Math.max(4, (d.count / maxDay) * 100),
                  background: "#0f172a",
                  borderRadius: 4,
                }}
              />
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>QR scans by placement</h2>
      {Object.keys(data.byPosition).length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No QR scans yet. Generate a standee in <a href="/seller/qr">QR Marketing</a> and scan it to see attribution here.
        </p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
          {Object.entries(data.byPosition).map(([pos, count]) => (
            <div key={pos} style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid #f8fafc", fontSize: 14 }}>
              <span>{pos}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

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

interface SalesAnalytics {
  totalRevenue: number;
  totalBills: number;
  totalItemsSold: number;
  topProducts: { title: string; quantity: number; revenue: number }[];
  last7Days: { date: string; revenue: number; count: number }[];
  byPaymentMode: Record<string, number>;
  repeatCustomers: number;
}

export default function AnalyticsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<Analytics | null>(null);
  const [sales, setSales] = useState<SalesAnalytics | null>(null);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/analytics`)
      .then((r) => r.json())
      .then(setData);
    fetch(`/api/v1/seller/stores/${store.id}/sales-analytics`)
      .then((r) => r.json())
      .then(setSales);
  }, [store]);

  if (storeLoading || !store || !data || !sales) {
    return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const maxDay = Math.max(1, ...data.last7Days.map((d) => d.count));
  const maxSalesDay = Math.max(1, ...sales.last7Days.map((d) => d.revenue));

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
      <p style={{ color: "#64748b", marginBottom: 20 }}>{store.name}</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Sales — from your in-store bills</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Total Revenue", value: `₹${sales.totalRevenue.toFixed(0)}`, icon: "💰" },
          { label: "Bills Issued", value: sales.totalBills, icon: "🧾" },
          { label: "Items Sold", value: sales.totalItemsSold, icon: "👕" },
          { label: "Repeat Customers", value: sales.repeatCustomers, icon: "🔁" },
        ].map((s) => (
          <div key={s.label} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {sales.totalBills === 0 ? (
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          No sales recorded yet — bills you create in <a href="/seller/sales">Sales &amp; Billing</a> will show up here.
        </p>
      ) : (
        <>
          <div className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#64748b" }}>Revenue — last 7 days</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
              {sales.last7Days.map((d) => (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>₹{d.revenue}</div>
                  <div style={{ width: "100%", height: Math.max(4, (d.revenue / maxSalesDay) * 80), background: "#16a34a", borderRadius: 4 }} />
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#64748b" }}>Top products by revenue</div>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                {sales.topProducts.map((p) => (
                  <div key={p.title} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f8fafc", fontSize: 13 }}>
                    <span>
                      {p.title} <span style={{ color: "#94a3b8" }}>× {p.quantity}</span>
                    </span>
                    <strong>₹{p.revenue.toFixed(0)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#64748b" }}>Payment modes</div>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                {Object.entries(sales.byPaymentMode).map(([mode, count]) => (
                  <div key={mode} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f8fafc", fontSize: 13 }}>
                    <span style={{ textTransform: "uppercase" }}>{mode}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Footfall — online discovery and QR standees</h2>
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

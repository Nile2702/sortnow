"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  profitAndLoss: {
    totalCost: number;
    totalProfit: number;
    profitMarginPercent: number;
    itemsWithCostSold: number;
    totalItemsSold: number;
    monthly: { month: string; revenue: number; cost: number; profit: number; marginPercent: number; itemsWithCostSold: number; totalItemsSold: number }[];
  };
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// A plain stat tile with nowhere to navigate to - no hover lift, so it
// doesn't invite a click that does nothing.
function StatTile({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>{label}</div>
    </div>
  );
}

// Same tile, but a real link - for stats that have an actual page behind
// them (the bills, the QR standees) - keeps the sio-card hover lift, since
// here it's honest: something happens on click.
function StatLink({ icon, value, label, href }: { icon: string; value: string | number; label: string; href: string }) {
  return (
    <Link href={href} className="sio-card" style={{ display: "block", background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, textDecoration: "none", color: "inherit" }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>{label}</div>
    </Link>
  );
}

export default function AnalyticsPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<Analytics | null>(null);
  const [sales, setSales] = useState<SalesAnalytics | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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

  // Years that actually have a bill, newest first - falls back to the
  // current year so the selector still has something to show on a brand
  // new store with no sales yet.
  const availableYears = [...new Set(sales.profitAndLoss.monthly.map((m) => Number(m.month.slice(0, 4))))].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const year = selectedYear ?? availableYears[0] ?? currentYear;
  const monthsForYear = sales.profitAndLoss.monthly.filter((m) => m.month.startsWith(String(year)));
  const yearTotal = monthsForYear.reduce(
    (acc, m) => ({ revenue: acc.revenue + m.revenue, cost: acc.cost + m.cost, profit: acc.profit + m.profit, itemsWithCostSold: acc.itemsWithCostSold + m.itemsWithCostSold }),
    { revenue: 0, cost: 0, profit: 0, itemsWithCostSold: 0 }
  );
  const yearMarginPercent = yearTotal.revenue > 0 ? Math.round((yearTotal.profit / yearTotal.revenue) * 1000) / 10 : 0;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Analytics &amp; Reports</h1>
      <p style={{ color: "#64748b", marginBottom: 20 }}>{store.name}</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Sales — from your in-store bills</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatLink icon="💰" value={`₹${sales.totalRevenue.toFixed(0)}`} label="Total Revenue" href="/seller/sales" />
        <StatLink icon="🧾" value={sales.totalBills} label="Bills Issued" href="/seller/sales" />
        <StatLink icon="👕" value={sales.totalItemsSold} label="Items Sold" href="/seller/sales" />
        <StatTile icon="🔁" value={sales.repeatCustomers} label="Repeat Customers" />
      </div>

      {sales.totalBills === 0 ? (
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          No sales recorded yet — bills you create in <a href="/seller/sales">Sales &amp; Billing</a> will show up here.
        </p>
      ) : (
        <>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, marginBottom: 20 }}>
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

          <div id="profit-and-loss" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Profit &amp; Loss</div>
              {availableYears.length > 0 && (
                <select
                  value={year}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {sales.profitAndLoss.itemsWithCostSold === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13, background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16 }}>
                No profit figures yet — set a cost price on your products (optional, on the Add/Edit Product page) to see profit here.
              </p>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                  <StatTile icon="📦" value={`₹${yearTotal.cost.toFixed(0)}`} label={`${year} Cost`} />
                  <StatTile icon="📈" value={`₹${yearTotal.profit.toFixed(0)}`} label={`${year} Profit`} />
                  <StatTile icon="🎯" value={`${yearMarginPercent}%`} label={`${year} Margin`} />
                </div>
                {sales.profitAndLoss.itemsWithCostSold < sales.profitAndLoss.totalItemsSold && (
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                    Figures only cover items sold while their product had a cost price set — items sold without one are left out rather than
                    assumed to have zero cost.
                  </p>
                )}

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Monthly breakdown — {year}
                  </div>
                  {monthsForYear.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: 13 }}>No costed sales in {year}.</p>
                  ) : (
                    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>
                        <span>Month</span>
                        <span style={{ textAlign: "right" }}>Revenue</span>
                        <span style={{ textAlign: "right" }}>Cost</span>
                        <span style={{ textAlign: "right" }}>Profit</span>
                      </div>
                      {monthsForYear.map((m) => (
                        <div
                          key={m.month}
                          style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "10px 16px", fontSize: 13, borderBottom: "1px solid #f8fafc", alignItems: "center" }}
                        >
                          <span>{MONTH_LABELS[Number(m.month.slice(5, 7)) - 1]}</span>
                          <span style={{ textAlign: "right" }}>₹{m.revenue.toFixed(0)}</span>
                          <span style={{ textAlign: "right", color: "#64748b" }}>₹{m.cost.toFixed(0)}</span>
                          <span style={{ textAlign: "right", fontWeight: 700, color: m.profit >= 0 ? "#16a34a" : "#dc2626" }}>
                            ₹{m.profit.toFixed(0)} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>({m.marginPercent}%)</span>
                          </span>
                        </div>
                      ))}
                      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "10px 16px", fontSize: 13, background: "#f8fafc", fontWeight: 700 }}>
                        <span>{year} Total</span>
                        <span style={{ textAlign: "right" }}>₹{yearTotal.revenue.toFixed(0)}</span>
                        <span style={{ textAlign: "right", color: "#64748b" }}>₹{yearTotal.cost.toFixed(0)}</span>
                        <span style={{ textAlign: "right", color: yearTotal.profit >= 0 ? "#16a34a" : "#dc2626" }}>
                          ₹{yearTotal.profit.toFixed(0)} <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>({yearMarginPercent}%)</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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
        <StatTile icon="👁️" value={data.totalPageViews} label="Total Page Views" />
        <StatTile icon="🔍" value={data.onlineViews} label="Online Discovery" />
        <StatLink icon="📱" value={data.totalQrScans} label="QR Scans" href="/seller/qr" />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Views — last 7 days</h2>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, marginBottom: 32 }}>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../lib/use-seller-store";
import { showToast } from "../../../lib/toast";

interface Product {
  id: string;
  basePrice: number;
  stockRemaining?: number;
}

interface LiveSale {
  headline: string;
  discountLabel: string;
  startedAt: string;
  endsAt: string;
}

export default function SellerDashboard() {
  const { store, loading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [liveSale, setLiveSale] = useState<LiveSale | null>(null);
  const [saleForm, setSaleForm] = useState({ headline: "Flash Sale — Today Only", discountLabel: "Flat 30% Off", durationHours: 4 });
  const [savingSale, setSavingSale] = useState(false);
  const [pendingReservations, setPendingReservations] = useState(0);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/products`)
      .then((r) => r.json())
      .then(setProducts);
    fetch(`/api/v1/seller/stores/${store.id}/billing`)
      .then((r) => r.json())
      .then((d) => setPlanName(d.plans.find((p: any) => p.code === d.subscription.planCode)?.name ?? null));
    fetch(`/api/v1/stores/${store.id}`)
      .then((r) => r.json())
      .then((d) => setLiveSale(d.liveSale ?? null));
    fetch(`/api/v1/seller/stores/${store.id}/reservations`)
      .then((r) => r.json())
      .then((list) => setPendingReservations(list.filter((r: any) => r.status === "pending").length));
  }, [store]);

  const saleIsActive = !!liveSale && new Date(liveSale.endsAt).getTime() > Date.now();

  async function handleStartSale(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setSavingSale(true);
    const res = await fetch(`/api/v1/stores/${store.id}/live-sale`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleForm),
    });
    const body = await res.json().catch(() => null);
    setSavingSale(false);
    // A rejected save (e.g. a blank headline) used to still show the
    // success toast and leave liveSale untouched, so the seller believed
    // a sale was running when the server never actually started one.
    if (!res.ok) {
      showToast(body?.message ?? "Couldn't start the Live Sale. Check the fields and try again.", "default");
      return;
    }
    setLiveSale(body);
    showToast("Live Sale started — shoppers will see it now", "success");
  }

  async function handleEndSale() {
    if (!store) return;
    setSavingSale(true);
    await fetch(`/api/v1/stores/${store.id}/live-sale`, { method: "DELETE" });
    setLiveSale(null);
    setSavingSale(false);
    showToast("Live Sale ended");
  }

  if (loading || !store) {
    return <main style={{ maxWidth: 1440, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const lowStock = products.filter((p) => (p.stockRemaining ?? 0) <= 5).length;

  // Styled identically to the "Quick actions" cards below (same sio-card
  // hover lift), so a stat that isn't actually clickable reads as a bug
  // ("why doesn't this do anything") rather than plain information - every
  // stat with a real destination gets one, except Store Status, which has
  // nowhere to go.
  const stats: { label: string; value: string | number; icon: string; href?: string }[] = [
    { label: "Total Products", value: products.length, icon: "📦", href: "/seller/products" },
    { label: "Pending Reservations", value: pendingReservations, icon: "🕐", href: "/seller/reservations" },
    { label: "Low Stock Alerts", value: lowStock, icon: "⚠️", href: "/seller/products?lowStock=1" },
    { label: "Plan", value: planName ?? "…", icon: "⭐", href: "/seller/billing" },
    { label: "Store Status", value: store.status, icon: "🟢" },
  ];

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back, {store.name}</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        {store.localMarket}, {store.city} · PIN {store.pincode}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => {
          const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, display: "block", textDecoration: "none", color: "inherit" };
          const content = (
            <>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, textTransform: "capitalize" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{s.label}</div>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="sio-card" style={cardStyle}>
              {content}
            </Link>
          ) : (
            <div key={s.label} style={cardStyle}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, marginBottom: 32 }}>
        {saleIsActive && liveSale ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="sio-breathe" style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#dc2626" }}>Live Sale Running</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{liveSale.headline}</div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
              {liveSale.discountLabel} · ends {new Date(liveSale.endsAt).toLocaleString()}
            </div>
            <button
              onClick={handleEndSale}
              disabled={savingSale}
              style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              End Sale Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleStartSale}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔴 Start a Live Sale</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>
              Flag your store as running a flash sale right now — shoppers see a live badge on your storefront, the shop directory, and nearby-store results.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 0.8fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Headline</label>
                <input
                  value={saleForm.headline}
                  onChange={(e) => setSaleForm((f) => ({ ...f, headline: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Discount label</label>
                <input
                  value={saleForm.discountLabel}
                  onChange={(e) => setSaleForm((f) => ({ ...f, discountLabel: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Duration</label>
                <select
                  value={saleForm.durationHours}
                  onChange={(e) => setSaleForm((f) => ({ ...f, durationHours: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                >
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={8}>8 hours</option>
                  <option value={24}>24 hours</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={savingSale}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Go Live
              </button>
            </div>
          </form>
        )}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Quick actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { href: "/seller/products/new", label: "Add a product", desc: "List a new SKU with sizes, price, and photos.", icon: "➕" },
          { href: "/seller/reservations", label: "View reservations", desc: "See who's coming to pick up what they've reserved.", icon: "🕐" },
          { href: "/seller/theme", label: "Customize your storefront", desc: "Pick your brand colors and hero message.", icon: "🎨" },
          { href: "/seller/qr", label: "Generate a QR standee", desc: "Print-ready QR linking shoppers to your catalog.", icon: "📱" },
          { href: "/seller/billing", label: "Manage billing", desc: "Switch plans, check SKU usage, download GST invoices.", icon: "💳" },
          { href: `/store/${store.slug}`, label: "View live storefront", desc: "See exactly what shoppers see right now.", icon: "👁️" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="sio-card"
            style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20, textDecoration: "none", color: "inherit" }}
          >
            <div style={{ fontSize: 20, marginBottom: 10 }}>{a.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.label}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{a.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../lib/use-seller-store";

interface Product {
  id: string;
  basePrice: number;
  stockRemaining?: number;
}

export default function SellerDashboard() {
  const { store, loading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/products`)
      .then((r) => r.json())
      .then(setProducts);
  }, [store]);

  if (loading || !store) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const lowStock = products.filter((p) => (p.stockRemaining ?? 0) <= 5).length;

  const stats = [
    { label: "Total Products", value: products.length, icon: "📦" },
    { label: "Low Stock Alerts", value: lowStock, icon: "⚠️" },
    { label: "Plan", value: "Pro", icon: "⭐" },
    { label: "Store Status", value: store.status, icon: "🟢" },
  ];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back, {store.name}</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        {store.localMarket}, {store.city} · PIN {store.pincode}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, textTransform: "capitalize" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Quick actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { href: "/seller/products/new", label: "Add a product", desc: "List a new SKU with sizes, price, and photos.", icon: "➕" },
          { href: "/seller/theme", label: "Customize your storefront", desc: "Pick your brand colors and hero message.", icon: "🎨" },
          { href: "/seller/qr", label: "Generate a QR standee", desc: "Print-ready QR linking shoppers to your catalog.", icon: "📱" },
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

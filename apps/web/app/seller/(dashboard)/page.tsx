"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../lib/use-seller-store";
import { LoadingScreen } from "../../../components/LoadingSpinner";
import { PackageIcon, ClockIcon, WarningIcon, StarIcon, StatusDot, PlusIcon, PaletteIcon, SmartphoneIcon, CreditCardIcon, EyeIcon } from "../../../components/icons";

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
  const [pendingReservations, setPendingReservations] = useState(0);
  // Products/reservations stats defaulted to their initial state (0 items,
  // 0 pending) the instant `store` loaded, so every stat tile flashed a
  // real-looking zero for a moment before its own fetch resolved - visually
  // identical to "this store genuinely has none", not an obvious loading
  // state. Tracked separately so the tiles can show a neutral placeholder
  // instead, same as "Plan" already did via `planName ?? "…"`.
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    // None of these four gate the page (it renders with whatever's loaded
    // so far), but each was still an unhandled rejection on a dropped/failed
    // request - harmless by itself, but exactly the kind of error that was
    // masking the real stuck-loading bugs elsewhere on pages that DO gate on
    // their data. Guarded the same way for consistency.
    Promise.all([
      fetch(`/api/v1/seller/stores/${store.id}/products`)
        .then((r) => r.json())
        .then(setProducts)
        .catch(() => {}),
      fetch(`/api/v1/seller/stores/${store.id}/reservations`)
        .then((r) => r.json())
        .then((list) => setPendingReservations(list.filter((r: any) => r.status === "pending").length))
        .catch(() => {}),
    ]).then(() => setStatsLoading(false));
    fetch(`/api/v1/seller/stores/${store.id}/billing`)
      .then((r) => r.json())
      .then((d) => setPlanName(d.plans.find((p: any) => p.code === d.subscription.planCode)?.name ?? null))
      .catch(() => {});
    fetch(`/api/v1/stores/${store.id}`)
      .then((r) => r.json())
      .then((d) => setLiveSale(d.liveSale ?? null))
      .catch(() => {});
  }, [store]);

  const saleIsActive = !!liveSale && new Date(liveSale.endsAt).getTime() > Date.now();

  if (loading || !store) {
    return <LoadingScreen maxWidth={1440} />;
  }

  const lowStock = products.filter((p) => (p.stockRemaining ?? 0) <= 5).length;

  // store.status is a snake_case enum ("pending_review") - `textTransform:
  // capitalize` on the raw value alone produced the ugly "Pending_review"
  // (it capitalizes the first letter of each underscore-separated word, not
  // the display label), and the icon below used to be a hardcoded green
  // circle regardless of actual status, so a suspended/pending store
  // wrongly looked "all good" at a glance.
  const STATUS_DISPLAY: Record<string, { label: string; dotColor: string }> = {
    active: { label: "Active", dotColor: "var(--sio-success)" },
    pending_review: { label: "Pending review", dotColor: "var(--sio-pending)" },
    suspended: { label: "Suspended", dotColor: "var(--sio-error)" },
    draft: { label: "Draft", dotColor: "var(--sio-line)" },
    closed: { label: "Closed", dotColor: "var(--sio-muted)" },
  };
  const statusDisplay = STATUS_DISPLAY[store.status] ?? { label: store.status, dotColor: "var(--sio-line)" };

  // Styled identically to the "Quick actions" cards below (same sio-card
  // hover lift), so a stat that isn't actually clickable reads as a bug
  // ("why doesn't this do anything") rather than plain information - every
  // stat with a real destination gets one, except Store Status, which has
  // nowhere to go.
  const stats: { label: string; value: string | number; icon: React.ReactNode; href?: string }[] = [
    { label: "Total Products", value: statsLoading ? "…" : products.length, icon: <PackageIcon size={22} strokeWidth={1.6} />, href: "/seller/products" },
    { label: "Pending Reservations", value: statsLoading ? "…" : pendingReservations, icon: <ClockIcon size={22} strokeWidth={1.6} />, href: "/seller/reservations" },
    { label: "Low Stock Alerts", value: statsLoading ? "…" : lowStock, icon: <WarningIcon size={22} strokeWidth={1.6} />, href: "/seller/products?lowStock=1" },
    { label: "Plan", value: planName ?? "…", icon: <StarIcon size={22} />, href: "/seller/billing" },
    { label: "Store Status", value: statusDisplay.label, icon: <StatusDot color={statusDisplay.dotColor} size={14} /> },
  ];

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back, {store.name}</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28 }}>
        {store.localMarket}, {store.city} · PIN {store.pincode}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s) => {
          const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 20, display: "block", textDecoration: "none", color: "inherit" };
          const content = (
            <>
              <div style={{ marginBottom: 8, color: "var(--sio-ink)", display: "flex" }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, textTransform: "capitalize" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--sio-muted)" }}>{s.label}</div>
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

      {/* Read-only - this badge used to be independently settable right here
          (free-text headline/discount label a seller typed by hand), which
          meant it could claim a discount with no real pricing behind it.
          It's now entirely derived from whichever Promotions campaign is
          actually running, so there's nothing to fill in or submit - only
          somewhere to see it and jump to the real control, Promotions. */}
      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 20, marginBottom: 32 }}>
        {saleIsActive && liveSale ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="sio-breathe" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sio-error)", display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sio-error)" }}>Live Sale Running</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{liveSale.headline}</div>
            <div style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 14 }}>
              {liveSale.discountLabel} · ends {new Date(liveSale.endsAt).toLocaleString()}
            </div>
            <Link
              href="/seller/promotions"
              style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid var(--sio-line)", background: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", color: "inherit" }}
            >
              Manage in Promotions →
            </Link>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No sale running right now</h2>
            <p style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 14 }}>
              Start one in Promotions and shoppers see a live badge here, on your storefront, the shop directory, and nearby-store results — on top
              of the actual discounted prices.
            </p>
            <Link
              href="/seller/promotions"
              style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--sio-error)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <StatusDot color="#fff" size={8} /> Start a sale
            </Link>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Quick actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[
          { href: "/seller/products/new", label: "Add a product", desc: "List a new SKU with sizes, price, and photos.", icon: <PlusIcon size={20} strokeWidth={1.8} /> },
          { href: "/seller/reservations", label: "View reservations", desc: "See who's coming to pick up what they've reserved.", icon: <ClockIcon size={20} strokeWidth={1.8} /> },
          { href: "/seller/theme", label: "Customize your storefront", desc: "Pick your brand colors and hero message.", icon: <PaletteIcon size={20} strokeWidth={1.6} /> },
          { href: "/seller/qr", label: "Generate a QR standee", desc: "Print-ready QR linking shoppers to your catalog.", icon: <SmartphoneIcon size={20} strokeWidth={1.6} /> },
          { href: "/seller/billing", label: "Manage billing", desc: "Switch plans, check SKU usage, download GST invoices.", icon: <CreditCardIcon size={20} strokeWidth={1.6} /> },
          { href: `/store/${store.slug}`, label: "View live storefront", desc: "See exactly what shoppers see right now.", icon: <EyeIcon size={20} strokeWidth={1.6} /> },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="sio-card"
            style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 20, textDecoration: "none", color: "inherit" }}
          >
            <div style={{ marginBottom: 10, color: "var(--sio-ink)", display: "flex" }}>{a.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.label}</div>
            <div style={{ fontSize: 13, color: "var(--sio-muted)" }}>{a.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

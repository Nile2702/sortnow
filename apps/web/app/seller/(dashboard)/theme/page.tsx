"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";

interface Theme {
  brand: { colors: { primary: string; accent: string } };
  layout: { heroCarousel?: { eyebrow?: string; title: string; subtitle?: string; ctaLabel?: string }[] };
}

export default function ThemeStudioPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [primary, setPrimary] = useState("#0f172a");
  const [accent, setAccent] = useState("#2563eb");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/stores/${store.id}/theme`)
      .then((r) => r.json())
      .then((t: Theme) => {
        setTheme(t);
        setPrimary(t.brand.colors.primary);
        setAccent(t.brand.colors.accent);
        setHeroTitle(t.layout.heroCarousel?.[0]?.title ?? "");
        setHeroSubtitle(t.layout.heroCarousel?.[0]?.subtitle ?? "");
      });
  }, [store]);

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/v1/stores/${store.id}/theme`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primary, accent, heroTitle, heroSubtitle }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Couldn't save your changes. Check the fields and try again.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (storeLoading || !store || !theme) {
    return <main style={{ maxWidth: 1100, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Theme Studio</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        No-code storefront customization for {store.name}. Fonts, spacing, and layout stay uniform across the platform — you control your
        brand color and hero message.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Primary color</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} style={{ width: 44, height: 36, border: "none", borderRadius: 8, cursor: "pointer" }} />
              <input value={primary} onChange={(e) => setPrimary(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, width: 120 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Accent color (CTA buttons, hover states)</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 44, height: 36, border: "none", borderRadius: 8, cursor: "pointer" }} />
              <input value={accent} onChange={(e) => setAccent(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, width: 120 }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Hero title</label>
            <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Hero subtitle</label>
            <textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, resize: "vertical" }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "13px 24px",
              borderRadius: 999,
              border: "none",
              background: saving ? "#94a3b8" : "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: saving ? "default" : "pointer",
              alignSelf: "flex-start",
            }}
          >
            {saving ? "Publishing…" : "Publish Changes"}
          </button>
          {saved && <span style={{ color: "#16a34a", fontSize: 13 }}>✓ Published — your live storefront is updated.</span>}
          {error && <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#64748b" }}>LIVE PREVIEW</div>
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 300 }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(140deg, #14110f 0%, ${primary} 55%, #14110f 100%)` }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55), transparent 60%)",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                height: "100%",
                padding: "0 24px",
                color: "#fff",
              }}
            >
              <h2 style={{ fontSize: 26, margin: 0, marginBottom: 10, fontFamily: "var(--site-font-heading)", fontWeight: 700 }}>{heroTitle}</h2>
              <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 18, maxWidth: 320 }}>{heroSubtitle}</p>
              <span style={{ padding: "10px 22px", borderRadius: 999, background: accent, fontSize: 13, fontWeight: 700 }}>
                {theme.layout.heroCarousel?.[0]?.ctaLabel ?? "Shop Now"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

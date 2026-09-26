"use client";

import { useEffect, useMemo, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { HERO_BACKGROUNDS, HERO_BACKGROUND_CATEGORIES, getHeroBackgroundById, heroBackgroundImageUrl } from "../../../../lib/hero-backgrounds";

interface Theme {
  brand: { colors: { primary: string; accent: string } };
  layout: { heroCarousel?: { eyebrow?: string; title: string; subtitle?: string; ctaLabel?: string; backgroundId?: string }[] };
}

export default function ThemeStudioPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [primary, setPrimary] = useState("#0f172a");
  const [accent, setAccent] = useState("#2563eb");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [backgroundId, setBackgroundId] = useState("");
  // Defaults to one category rather than "All" (1000 backgrounds total) so
  // the picker doesn't try to load 1000 thumbnail photos on first render -
  // "All" is still one dropdown pick away, and native <img loading="lazy">
  // means only what's scrolled into view actually fetches either way.
  const [bgCategory, setBgCategory] = useState<string>(HERO_BACKGROUND_CATEGORIES[0]);
  const [bgSearch, setBgSearch] = useState("");
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
        setBackgroundId(t.layout.heroCarousel?.[0]?.backgroundId ?? "");
      });
  }, [store]);

  const filteredBackgrounds = useMemo(() => {
    const q = bgSearch.trim().toLowerCase();
    return HERO_BACKGROUNDS.filter((b) => {
      if (bgCategory !== "All" && b.category !== bgCategory) return false;
      if (q && !b.label.toLowerCase().includes(q) && !b.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bgCategory, bgSearch]);

  const selectedBackground = getHeroBackgroundById(backgroundId);

  async function handleSave() {
    if (!store) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/v1/stores/${store.id}/theme`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primary, accent, heroTitle, heroSubtitle, backgroundId: backgroundId || null }),
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
    return <main style={{ maxWidth: 1440, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Theme Studio</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        No-code storefront customization for {store.name}. Fonts, spacing, and layout stay uniform across the platform — you control your
        brand color and hero message.
      </p>

      <div className="sio-two-col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
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

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Hero background <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional — {HERO_BACKGROUNDS.length} to choose from)</span>
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input
                value={bgSearch}
                onChange={(e) => setBgSearch(e.target.value)}
                placeholder="Search e.g. denim, bridal, kids…"
                style={{ flex: "1 1 180px", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
              />
              <select
                value={bgCategory}
                onChange={(e) => setBgCategory(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
              >
                <option value="All">All shop types</option>
                {HERO_BACKGROUND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {backgroundId && (
              <button
                type="button"
                onClick={() => setBackgroundId("")}
                style={{ marginBottom: 10, fontSize: 12.5, color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                ✕ Clear — use plain color gradient instead
              </button>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 8,
                maxHeight: 260,
                overflowY: "auto",
                padding: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#f8fafc",
              }}
            >
              {filteredBackgrounds.length === 0 && (
                <p style={{ fontSize: 12.5, color: "#94a3b8", gridColumn: "1 / -1" }}>No backgrounds match that search.</p>
              )}
              {filteredBackgrounds.map((bg) => {
                const isSelected = bg.id === backgroundId;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackgroundId(bg.id)}
                    title={bg.label}
                    style={{
                      height: 56,
                      borderRadius: 10,
                      border: isSelected ? "2.5px solid #0f172a" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      padding: 0,
                      position: "relative",
                      overflow: "hidden",
                      background: "#e2e8f0",
                    }}
                  >
                    <img
                      src={heroBackgroundImageUrl(bg, 160, 100)}
                      alt={bg.label}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#0f172a",
                          color: "#fff",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedBackground && (
              <p style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>Selected: {selectedBackground.label}</p>
            )}
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: selectedBackground
                  ? `url(${heroBackgroundImageUrl(selectedBackground, 900, 400)}) center/cover no-repeat`
                  : `linear-gradient(140deg, #14110f 0%, ${primary} 55%, #14110f 100%)`,
              }}
            />
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

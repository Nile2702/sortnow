"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProductFormData {
  id?: string;
  title: string;
  description: string;
  fabric: string;
  gender: string;
  subCategory: string;
  basePrice: number;
  compareAtPrice?: number;
  sizes: string[];
  stockRemaining: number;
  imageColor: string;
}

const GENDER_SUBCATEGORIES: Record<string, string[]> = {
  men: ["Jeans", "Jackets", "Shirts", "T-Shirts"],
  women: ["Sarees", "Kurtis", "Lehengas", "Western Wear"],
  kids: ["Boys", "Girls", "Infant"],
};

const ALL_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "2-3Y", "4-5Y", "6-7Y", "8-9Y"];

const SWATCHES = ["#7c2d12", "#1e3a8a", "#9f1239", "#166534", "#7a1f3d", "#0f172a", "#b45309", "#4c1d95"];

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 };
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" };
}

export function ProductForm({ storeId, initial, mode }: { storeId: string; initial?: Partial<ProductFormData>; mode: "create" | "edit" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    fabric: initial?.fabric ?? "",
    gender: initial?.gender ?? "women",
    subCategory: initial?.subCategory ?? GENDER_SUBCATEGORIES[initial?.gender ?? "women"][0],
    basePrice: initial?.basePrice ?? 999,
    compareAtPrice: initial?.compareAtPrice,
    sizes: initial?.sizes ?? ["Free Size"],
    stockRemaining: initial?.stockRemaining ?? 10,
    imageColor: initial?.imageColor ?? SWATCHES[0],
  });

  function update<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleSize(size: string) {
    setForm((f) => ({ ...f, sizes: f.sizes.includes(size) ? f.sizes.filter((s) => s !== size) : [...f.sizes, size] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      fabric: form.fabric,
      gender: form.gender,
      subCategory: form.subCategory,
      basePrice: Number(form.basePrice),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      sizes: form.sizes,
      stockRemaining: Number(form.stockRemaining),
      images: [{ url: placeholderDataUrl(form.title || "Product", form.imageColor) }],
    };

    if (mode === "create") {
      await fetch(`/api/v1/seller/stores/${storeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/v1/seller/products/${initial?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    router.push("/seller/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
      <div>
        <label style={labelStyle()}>Product title</label>
        <input required value={form.title} onChange={(e) => update("title", e.target.value)} style={inputStyle()} placeholder="e.g. Cotton Anarkali Kurti — Mustard" />
      </div>

      <div>
        <label style={labelStyle()}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          style={{ ...inputStyle(), resize: "vertical" }}
          placeholder="Fabric, fit, occasion..."
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle()}>Category</label>
          <select
            value={form.gender}
            onChange={(e) => {
              update("gender", e.target.value);
              update("subCategory", GENDER_SUBCATEGORIES[e.target.value][0]);
            }}
            style={inputStyle()}
          >
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="kids">Kids</option>
          </select>
        </div>
        <div>
          <label style={labelStyle()}>Subcategory</label>
          <select value={form.subCategory} onChange={(e) => update("subCategory", e.target.value)} style={inputStyle()}>
            {GENDER_SUBCATEGORIES[form.gender].map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle()}>Price (₹)</label>
          <input required type="number" min={0} value={form.basePrice} onChange={(e) => update("basePrice", Number(e.target.value) as any)} style={inputStyle()} />
        </div>
        <div>
          <label style={labelStyle()}>Compare-at price</label>
          <input
            type="number"
            min={0}
            value={form.compareAtPrice ?? ""}
            onChange={(e) => update("compareAtPrice", (e.target.value ? Number(e.target.value) : undefined) as any)}
            style={inputStyle()}
            placeholder="Optional"
          />
        </div>
        <div>
          <label style={labelStyle()}>Stock qty</label>
          <input required type="number" min={0} value={form.stockRemaining} onChange={(e) => update("stockRemaining", Number(e.target.value) as any)} style={inputStyle()} />
        </div>
      </div>

      <div>
        <label style={labelStyle()}>Fabric</label>
        <input value={form.fabric} onChange={(e) => update("fabric", e.target.value)} style={inputStyle()} placeholder="e.g. Cotton, Silk, Denim" />
      </div>

      <div>
        <label style={labelStyle()}>Sizes</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ALL_SIZE_OPTIONS.map((sz) => (
            <button
              type="button"
              key={sz}
              onClick={() => toggleSize(sz)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: form.sizes.includes(sz) ? "2px solid #0f172a" : "1px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle()}>Product image color (demo placeholder)</label>
        <div style={{ display: "flex", gap: 8 }}>
          {SWATCHES.map((sw) => (
            <button
              type="button"
              key={sw}
              onClick={() => update("imageColor", sw)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: sw,
                border: form.imageColor === sw ? "3px solid #0f172a" : "1px solid #e2e8f0",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
          Real deployments upload photos through the Media Pipeline (docs/02-system-architecture.md); this demo generates a colored placeholder instead.
        </p>
      </div>

      <button
        type="submit"
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
        }}
      >
        {saving ? "Saving…" : mode === "create" ? "Publish Product" : "Save Changes"}
      </button>
    </form>
  );
}

function placeholderDataUrl(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="42" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>
  </svg>`;
  if (typeof window === "undefined") return "";
  return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

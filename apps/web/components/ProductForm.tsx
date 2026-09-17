"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_TREE, COLOR_CATALOG } from "../lib/catalog-constants";
import { PhotoEnhanceIllustration } from "./PhotoEnhanceIllustration";

type PhotoStage = "raw" | "bg-removed" | "mannequin";

interface ProductFormData {
  id?: string;
  title: string;
  description: string;
  fabric: string;
  color?: string;
  gender: string;
  subCategory: string;
  basePrice: number;
  compareAtPrice?: number;
  sizes: string[];
  stockRemaining: number;
  imageColor: string;
}

const GENDER_SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(CATEGORY_TREE.map((c) => [c.value, c.subCategories]));

const ALL_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "7", "8", "9", "10", "2-3Y", "4-5Y", "6-7Y", "8-9Y"];

const SWATCHES = ["#7c2d12", "#1e3a8a", "#9f1239", "#166534", "#7a1f3d", "#0f172a", "#b45309", "#4c1d95"];

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 };
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" };
}

export function ProductForm({
  storeId,
  initial,
  initialImageUrl,
  initialAdditionalImages,
  mode,
}: {
  storeId: string;
  initial?: Partial<ProductFormData>;
  initialImageUrl?: string;
  initialAdditionalImages?: string[];
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialImageUrl ?? null);
  const [uploadError, setUploadError] = useState("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [photoStage, setPhotoStage] = useState<PhotoStage>("raw");

  // Extra angle/detail shots beyond the primary photo - shown as a gallery
  // on the storefront (see the product detail page's thumbnail strip) but
  // not run through any AI tooling (background removal, mannequin,
  // autofill), which all operate on the primary photo only.
  const [additionalImages, setAdditionalImages] = useState<string[]>(initialAdditionalImages ?? []);
  const [additionalUploadError, setAdditionalUploadError] = useState("");

  const [bgRemoving, setBgRemoving] = useState(false);
  const [bgRemoveProgress, setBgRemoveProgress] = useState("");
  const [bgRemoveError, setBgRemoveError] = useState("");

  const [mannequinApplying, setMannequinApplying] = useState(false);
  const [mannequinError, setMannequinError] = useState("");

  const [credits, setCredits] = useState<number | null>(null);

  const [autofillHint, setAutofillHint] = useState("");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState("");
  const [autofilled, setAutofilled] = useState(false);

  // Selecting more than one color creates one product per color on submit
  // (see handleSubmit) - all sharing this same title/description/price/
  // photo, only the color attribute differs - so a seller doesn't have to
  // photograph and re-list every colorway of the same item separately.
  const [selectedColors, setSelectedColors] = useState<string[]>(initial?.color ? [initial.color] : []);

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

  function toggleColor(name: string) {
    setSelectedColors((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]));
  }

  useEffect(() => {
    fetch(`/api/v1/seller/stores/${storeId}/photo-credits`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCredits(d?.balance ?? null));
  }, [storeId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setBgRemoveError("");
    setMannequinError("");
    setPhotoStage("raw");
    setOriginalImage(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError("Image is too large — please choose one under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleAdditionalFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setAdditionalUploadError("");

    const MAX_ADDITIONAL = 5;
    if (additionalImages.length + files.length > MAX_ADDITIONAL) {
      setAdditionalUploadError(`You can add up to ${MAX_ADDITIONAL} additional photos.`);
      return;
    }

    const readOne = (file: File) =>
      new Promise<string | null>((resolve) => {
        if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

    const results = await Promise.all(files.map(readOne));
    const valid = results.filter((r): r is string => r !== null);
    if (valid.length < files.length) {
      setAdditionalUploadError("Some photos were skipped — only images under 3MB are supported.");
    }
    setAdditionalImages((imgs) => [...imgs, ...valid]);
  }

  function removeAdditionalImage(index: number) {
    setAdditionalImages((imgs) => imgs.filter((_, i) => i !== index));
  }

  // Free, runs entirely client-side via a WASM ML model - no API key, no
  // server call, no per-image cost. Only the optional mannequin step below
  // costs a credit.
  //
  // Loaded from jsDelivr's ESM CDN via a webpackIgnore'd dynamic import
  // rather than the npm package - @imgly/background-removal's own docs say
  // "currently only NextJS 15 is supported" (this app is on 14), and in
  // practice its onnxruntime-web dependency ships Node/WebGPU runtime files
  // referenced via `new URL(...)` that Next 14's webpack tries to minify
  // with Terser and fails on (invalid module syntax for a script-mode
  // parse). Loading it as a plain browser ES module sidesteps that build
  // pipeline entirely - verified working end-to-end (a real
  // background-removal call against a canvas-generated test image
  // succeeded), just not exercised through webpack at all.
  async function handleRemoveBackground() {
    if (!uploadedImage) return;
    setBgRemoving(true);
    setBgRemoveError("");
    setBgRemoveProgress("Loading background-removal model…");
    if (!originalImage) setOriginalImage(uploadedImage);

    try {
      // Cast since the npm package (and its types) isn't installed - it's
      // loaded as a plain ES module from a CDN URL instead (see comment
      // above), which TypeScript can't resolve a module path for.
      const { removeBackground } = (await import(
        /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm"
      )) as {
        removeBackground: (
          image: string,
          config?: { model?: string; output?: { format?: string }; progress?: (key: string, current: number, total: number) => void }
        ) => Promise<Blob>;
      };
      const resultBlob = await removeBackground(uploadedImage, {
        model: "isnet_quint8",
        output: { format: "image/png" },
        progress: (key, current, total) => {
          if (total > 0) setBgRemoveProgress(`Processing… ${Math.round((current / total) * 100)}%`);
        },
      });
      const dataUrl = await blobToDataUrl(resultBlob);
      setUploadedImage(dataUrl);
      setPhotoStage("bg-removed");
    } catch (err) {
      console.error(err);
      setBgRemoveError("Couldn't remove the background in this browser. Try a different browser or use the original photo.");
    } finally {
      setBgRemoving(false);
      setBgRemoveProgress("");
    }
  }

  async function handleAddMannequin() {
    if (!uploadedImage) return;
    if (credits !== null && credits <= 0) {
      setMannequinError("You're out of AI photo credits.");
      return;
    }
    setMannequinApplying(true);
    setMannequinError("");
    if (!originalImage) setOriginalImage(uploadedImage);
    const res = await fetch("/api/v1/seller/photo-enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: uploadedImage }),
    });
    const result = await res.json().catch(() => null);
    setMannequinApplying(false);
    if (!res.ok) {
      setMannequinError(result?.message ?? "Couldn't enhance this photo. Try again.");
      return;
    }
    setUploadedImage(result.imageDataUrl);
    setPhotoStage("mannequin");
    if (typeof result.creditsRemaining === "number") setCredits(result.creditsRemaining);
  }

  function handleRevertToOriginal() {
    setUploadedImage(originalImage);
    setPhotoStage("raw");
    setBgRemoveError("");
    setMannequinError("");
  }

  async function handleAutofill() {
    if (!uploadedImage) return;
    setAutofilling(true);
    setAutofillError("");
    const analysisImage = await resizeForAnalysis(uploadedImage).catch(() => uploadedImage);
    const res = await fetch("/api/v1/seller/photo-autofill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: analysisImage, hint: autofillHint.trim() || undefined }),
    });
    const result = await res.json().catch(() => null);
    setAutofilling(false);
    if (!res.ok) {
      setAutofillError(result?.message ?? "Couldn't suggest details for this photo. Try again.");
      return;
    }
    setForm((f) => ({
      ...f,
      title: result.title || f.title,
      description: result.description || f.description,
      fabric: result.fabric || f.fabric,
      gender: result.gender || f.gender,
      subCategory: result.subCategory || GENDER_SUBCATEGORIES[result.gender]?.[0] || f.subCategory,
    }));
    setAutofilled(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const basePayload = {
      description: form.description,
      fabric: form.fabric,
      gender: form.gender,
      subCategory: form.subCategory,
      basePrice: Number(form.basePrice),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      sizes: form.sizes,
      stockRemaining: Number(form.stockRemaining),
      images: [
        { url: uploadedImage ?? placeholderDataUrl(form.title || "Product", form.imageColor) },
        ...additionalImages.map((url) => ({ url })),
      ],
    };

    if (mode === "create") {
      // Selecting 2+ colors lists the same item once per color, sharing
      // every other field and the single uploaded photo, instead of the
      // seller re-uploading and re-typing details for each colorway.
      const colorsToCreate = selectedColors.length > 0 ? selectedColors : [undefined];
      await Promise.all(
        colorsToCreate.map((color) =>
          fetch(`/api/v1/seller/stores/${storeId}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...basePayload,
              title: color && colorsToCreate.length > 1 ? `${form.title} — ${color}` : form.title,
              color,
            }),
          })
        )
      );
    } else {
      await fetch(`/api/v1/seller/products/${initial?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, title: form.title, color: selectedColors[0] }),
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
          rows={5}
          style={{ ...inputStyle(), resize: "vertical" }}
          placeholder="Fabric, fit, occasion..."
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
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
        <label style={labelStyle()}>
          Colors {mode === "create" && <span style={{ fontWeight: 400, color: "#94a3b8" }}>(pick more than one to list every color at once)</span>}
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {COLOR_CATALOG.map((c) => {
            const active = selectedColors.includes(c.name);
            return (
              <button
                type="button"
                key={c.name}
                onClick={() => toggleColor(c.name)}
                title={c.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px 5px 5px",
                  borderRadius: 999,
                  border: active ? "2px solid #0f172a" : "1px solid #e2e8f0",
                  background: active ? "#f1f5f9" : "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: c.hex,
                    border: "1px solid rgba(0,0,0,0.12)",
                    flexShrink: 0,
                  }}
                />
                {c.name}
              </button>
            );
          })}
        </div>
        {selectedColors.length > 1 && mode === "create" && (
          <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 8 }}>
            Publishing will create {selectedColors.length} separate products — one per color — all sharing this title, price, and photo.
          </p>
        )}
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
        <label style={labelStyle()}>Product photo</label>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          {uploadedImage && (
            <div>
              <div style={{ position: "relative" }}>
                <img src={uploadedImage} alt="Preview" style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }} />
                {photoStage !== "raw" && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: photoStage === "mannequin" ? "#7c3aed" : "#0f172a",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {photoStage === "mannequin" ? "✨ AI Mannequin" : "🪄 BG Removed"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUploadedImage(null);
                    setOriginalImage(null);
                    setPhotoStage("raw");
                    setBgRemoveError("");
                    setMannequinError("");
                  }}
                  aria-label="Remove photo"
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "none",
                    background: "#0f172a",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              <button
                type="button"
                onClick={handleRemoveBackground}
                disabled={bgRemoving || mannequinApplying}
                style={{
                  marginTop: 14,
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: bgRemoving ? "#94a3b8" : "#0f172a",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: bgRemoving ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  width: "100%",
                }}
              >
                {bgRemoving ? bgRemoveProgress || "Removing…" : "🪄 Remove Background (Free)"}
              </button>

              <button
                type="button"
                onClick={handleAddMannequin}
                disabled={mannequinApplying || bgRemoving || credits === 0}
                style={{
                  marginTop: 6,
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: mannequinApplying || credits === 0 ? "#94a3b8" : "#7c3aed",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: mannequinApplying || credits === 0 ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  width: "100%",
                }}
              >
                {mannequinApplying ? "Applying…" : credits === 0 ? "✨ Add Mannequin — 0 credits left" : "✨ Add Mannequin (1 credit)"}
              </button>
              {credits === 0 && (
                <a href="/seller/photo-credits" style={{ display: "block", marginTop: 6, textAlign: "center", fontSize: 11, color: "#7c3aed" }}>
                  Buy more credits →
                </a>
              )}

              {photoStage !== "raw" && originalImage && (
                <button
                  type="button"
                  onClick={handleRevertToOriginal}
                  style={{ marginTop: 6, background: "none", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer", width: "100%", textDecoration: "underline" }}
                >
                  Revert to original
                </button>
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: 13 }} />
            {uploadError && <p style={{ fontSize: 12, color: "#e11d48", marginTop: 6 }}>{uploadError}</p>}
            {bgRemoveError && <p style={{ fontSize: 12, color: "#e11d48", marginTop: 6 }}>{bgRemoveError}</p>}
            {mannequinError && <p style={{ fontSize: 12, color: "#e11d48", marginTop: 6 }}>{mannequinError}</p>}

            {uploadedImage && !uploadError && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>✨ Auto-fill from photo</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={autofillHint}
                    onChange={(e) => setAutofillHint(e.target.value)}
                    placeholder="Optional hint — e.g. Top wear, Saree, Kids' t-shirt"
                    style={{ ...inputStyle(), flex: 1, background: "#fff" }}
                  />
                  <button
                    type="button"
                    onClick={handleAutofill}
                    disabled={autofilling}
                    style={{
                      padding: "0 16px",
                      borderRadius: 10,
                      border: "none",
                      background: autofilling ? "#94a3b8" : "#7c3aed",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: autofilling ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {autofilling ? "Thinking…" : "Auto-fill"}
                  </button>
                </div>
                {autofillError && <p style={{ fontSize: 12, color: "#e11d48", marginTop: 8 }}>{autofillError}</p>}
                {autofilled && !autofillError && (
                  <p style={{ fontSize: 12, color: "#16a34a", marginTop: 8 }}>✓ Title, category, and description filled in below — review and edit as needed.</p>
                )}
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>
                  Gemini looks at the photo (and your hint, if given) to suggest a title, category, and description. Price, stock, and sizes are
                  yours to set.
                </p>
              </div>
            )}

            {uploadedImage && !uploadError && !bgRemoveError && !mannequinError && photoStage === "raw" && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "var(--sio-cream)", border: "1px solid var(--sio-line)" }}>
                <PhotoEnhanceIllustration />
                <p style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 10, lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--sio-ink)" }}>Remove Background</strong> runs free, right in your browser — no cost, no limit.{" "}
                  <strong style={{ color: "var(--sio-ink)" }}>Add Mannequin</strong> sends the photo to Gemini AI and uses 1 photo credit
                  {credits !== null && (
                    <>
                      {" "}
                      (you have <strong style={{ color: "var(--sio-ink)" }}>{credits}</strong> left)
                    </>
                  )}
                  .
                </p>
              </div>
            )}

            {!uploadedImage && (
              <>
                <div style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0 6px" }}>Or pick a placeholder color:</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {SWATCHES.map((sw) => (
                    <button
                      type="button"
                      key={sw}
                      onClick={() => update("imageColor", sw)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: sw,
                        border: form.imageColor === sw ? "3px solid #0f172a" : "1px solid #e2e8f0",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
          Uploaded photos are kept in-memory for this demo (resets on server restart). Real deployments run uploads through the Media
          Pipeline / CDN (docs/02-system-architecture.md).
        </p>
      </div>

      {uploadedImage && (
        <div>
          <label style={labelStyle()}>Additional photos (optional)</label>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
            Extra angles or close-ups shoppers can browse alongside your main photo. These don't go through background removal, AI
            mannequin, or auto-fill — only your main photo above does.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {additionalImages.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={img} alt={`Additional ${i + 1}`} style={{ width: 64, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <button
                  type="button"
                  onClick={() => removeAdditionalImage(i)}
                  aria-label="Remove photo"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "#0f172a",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {additionalImages.length < 5 && (
            <input type="file" accept="image/*" multiple onChange={handleAdditionalFilesChange} style={{ fontSize: 13 }} />
          )}
          {additionalUploadError && <p style={{ fontSize: 12, color: "#e11d48", marginTop: 6 }}>{additionalUploadError}</p>}
        </div>
      )}

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
        {saving
          ? "Saving…"
          : mode === "create"
            ? selectedColors.length > 1
              ? `Publish ${selectedColors.length} Products`
              : "Publish Product"
            : "Save Changes"}
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Downscales an image before sending it for AI analysis - a full 3MB photo
// takes noticeably longer to upload and for the model to process than it
// needs to for reading a garment's color/style/category, and this version
// is never shown or saved, only sent to the API. Not used for the
// mannequin-placement step, where the actual output image quality matters.
function resizeForAnalysis(dataUrl: string, maxDimension = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Couldn't load image for resizing"));
    img.src = dataUrl;
  });
}

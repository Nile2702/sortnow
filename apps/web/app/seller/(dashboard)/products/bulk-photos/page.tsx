"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSellerStore } from "../../../../../lib/use-seller-store";
import { CATEGORY_TREE, getSizeOptionsFor } from "../../../../../lib/catalog-constants";
import { autoAlignAndZoom, autoEnhanceQuality, stabilizeLighting, reduceWrinkles } from "../../../../../lib/image-enhance";
import { showToast } from "../../../../../lib/toast";

const GENDER_SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(CATEGORY_TREE.map((c) => [c.value, c.subCategories]));

type DraftStatus = "queued" | "removing-bg" | "autofilling" | "ready" | "publishing" | "published" | "error";

interface Draft {
  localId: string;
  fileName: string;
  originalImage: string;
  image: string;
  bgRemoved: boolean;
  status: DraftStatus;
  error: string;
  title: string;
  gender: string;
  subCategory: string;
  fabric: string;
  description: string;
  basePrice: number;
  compareAtPrice: number | undefined;
  stockRemaining: number;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 };
}

export default function BulkPhotoUploadPage() {
  const router = useRouter();
  const { store, loading: storeLoading } = useSellerStore();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");

  function updateDraft(localId: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const newDrafts: Draft[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) continue;
      const dataUrl = await fileToDataUrl(file);
      newDrafts.push({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fileName: file.name,
        originalImage: dataUrl,
        image: dataUrl,
        bgRemoved: false,
        status: "queued",
        error: "",
        title: "",
        gender: "women",
        subCategory: GENDER_SUBCATEGORIES.women[0],
        fabric: "",
        description: "",
        basePrice: 999,
        compareAtPrice: undefined,
        stockRemaining: 10,
      });
    }
    setDrafts((ds) => [...ds, ...newDrafts]);
  }

  function removeDraft(localId: string) {
    setDrafts((ds) => ds.filter((d) => d.localId !== localId));
  }

  // Runs free background removal + AI autofill across every queued photo,
  // one at a time - sequential rather than parallel so a browser doesn't
  // try to run several heavy WASM segmentation models at once, and so the
  // autofill calls stay comfortably under the API's rate limit regardless
  // of batch size. Each draft's fields become editable as soon as its own
  // processing finishes, without waiting for the rest of the batch.
  async function handleProcessAll() {
    setProcessing(true);
    const queue = drafts.filter((d) => d.status === "queued" || d.status === "error");

    for (let i = 0; i < queue.length; i++) {
      const draft = queue[i];
      setProgressLabel(`Processing photo ${i + 1} of ${queue.length}: ${draft.fileName}`);
      updateDraft(draft.localId, { status: "removing-bg", error: "" });

      let currentImage = draft.originalImage;
      try {
        const litInput = await stabilizeLighting(draft.originalImage).catch(() => draft.originalImage);
        const enhancedInput = await autoEnhanceQuality(litInput).catch(() => litInput);
        const smoothedInput = await reduceWrinkles(enhancedInput).catch(() => enhancedInput);
        const { removeBackground } = (await import(
          /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm"
        )) as { removeBackground: (image: string, config?: { model?: string; output?: { format?: string } }) => Promise<Blob> };
        const blob = await removeBackground(smoothedInput, { model: "isnet_quint8", output: { format: "image/png" } });
        const bgRemovedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        currentImage = await autoAlignAndZoom(bgRemovedUrl).catch(() => bgRemovedUrl);
        updateDraft(draft.localId, { image: currentImage, bgRemoved: true });
      } catch (err) {
        console.error(err);
        // Background removal failing isn't fatal - autofill can still run
        // on the original photo, and the seller can retry bg removal later.
      }

      updateDraft(draft.localId, { status: "autofilling" });
      try {
        const res = await fetch("/api/v1/seller/photo-autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: currentImage }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.message ?? "Autofill failed");
        updateDraft(draft.localId, {
          status: "ready",
          title: result.title ?? "",
          description: result.description ?? "",
          fabric: result.fabric ?? "",
          gender: result.gender ?? "women",
          subCategory: result.subCategory ?? GENDER_SUBCATEGORIES[result.gender ?? "women"][0],
        });
      } catch (err: any) {
        updateDraft(draft.localId, { status: "error", error: err?.message ?? "Couldn't process this photo." });
      }
    }

    setProgressLabel("");
    setProcessing(false);
  }

  async function handlePublishAll() {
    if (!store) return;
    setPublishing(true);
    const toPublish = drafts.filter((d) => d.status === "ready");

    await Promise.all(
      toPublish.map(async (d) => {
        updateDraft(d.localId, { status: "publishing" });
        try {
          const res = await fetch(`/api/v1/seller/stores/${store.id}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: d.title || d.fileName,
              description: d.description,
              fabric: d.fabric,
              gender: d.gender,
              subCategory: d.subCategory,
              basePrice: d.basePrice,
              compareAtPrice: d.compareAtPrice,
              stockRemaining: d.stockRemaining,
              // No size picker in this quick-publish flow - default to every
              // size valid for the category (e.g. all shoe sizes for
              // Footwear) rather than "Free Size" for everything, which was
              // wrong for any category that isn't genuinely one-size. The
              // seller can narrow it down later via Edit.
              sizes: getSizeOptionsFor(d.subCategory),
              images: [{ url: d.image }],
            }),
          });
          if (!res.ok) throw new Error("Publish failed");
          updateDraft(d.localId, { status: "published" });
        } catch {
          updateDraft(d.localId, { status: "error", error: "Couldn't publish this product." });
        }
      })
    );

    setPublishing(false);
    const publishedCount = toPublish.length;
    showToast(`Published ${publishedCount} product${publishedCount === 1 ? "" : "s"}.`, "success");
    router.push("/seller/products");
    router.refresh();
  }

  if (storeLoading || !store) {
    return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  const readyCount = drafts.filter((d) => d.status === "ready").length;
  const hasQueuedOrError = drafts.some((d) => d.status === "queued" || d.status === "error");

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/seller/products" style={{ fontSize: 13, color: "#64748b" }}>
          ← Back to Products
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>✨ AI Bulk Upload</h1>
      <p style={{ color: "#64748b", marginBottom: 24, maxWidth: 640 }}>
        Upload several raw product photos at once for {store.name}. Each one automatically gets its background removed, centered, and
        zoomed to fill the frame (free), plus a title, category, and description suggested by AI — review and adjust before publishing.
        Price, stock, and sizes default to placeholders you should edit.
      </p>

      <div
        className="sio-card"
        style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24 }}
      >
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 10 }}>Select photos</label>
        <input type="file" accept="image/*" multiple onChange={handleFilesSelected} style={{ fontSize: 13, width: "100%", maxWidth: "100%" }} />
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Up to 3MB per photo. Add more photos any time before processing.</p>

        {drafts.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={handleProcessAll}
              disabled={processing || !hasQueuedOrError}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "none",
                background: processing || !hasQueuedOrError ? "#94a3b8" : "#7c3aed",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: processing || !hasQueuedOrError ? "default" : "pointer",
              }}
            >
              {processing ? progressLabel || "Processing…" : "✨ Process All (Free)"}
            </button>
            <button
              type="button"
              onClick={handlePublishAll}
              disabled={publishing || readyCount === 0}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "none",
                background: publishing || readyCount === 0 ? "#94a3b8" : "#0f172a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: publishing || readyCount === 0 ? "default" : "pointer",
              }}
            >
              {publishing ? "Publishing…" : `Publish ${readyCount || ""} Product${readyCount === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>

      {drafts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {drafts.map((d) => (
            <div
              key={d.localId}
              className="sio-card sio-draft-row"
              style={{ display: "flex", gap: 16, background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 16 }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={d.image} alt={d.fileName} style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                {d.bgRemoved && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: -6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#0f172a",
                      color: "#fff",
                      fontSize: 8,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    🪄 Enhanced
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <StatusBadge status={d.status} />
                  <button
                    type="button"
                    onClick={() => removeDraft(d.localId)}
                    disabled={d.status === "removing-bg" || d.status === "autofilling" || d.status === "publishing"}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}
                  >
                    Remove
                  </button>
                </div>

                {d.status === "queued" ? (
                  <p style={{ fontSize: 13, color: "#94a3b8" }}>{d.fileName} — waiting to be processed.</p>
                ) : d.status === "removing-bg" ? (
                  <p style={{ fontSize: 13, color: "#94a3b8" }}>Removing background…</p>
                ) : d.status === "autofilling" ? (
                  <p style={{ fontSize: 13, color: "#94a3b8" }}>Asking AI for title, category, and description…</p>
                ) : d.status === "error" ? (
                  <p style={{ fontSize: 13, color: "#e11d48" }}>{d.error || "Something went wrong."}</p>
                ) : d.status === "published" ? (
                  <p style={{ fontSize: 13, color: "#16a34a" }}>✓ Published as "{d.title}"</p>
                ) : (
                  <div className="sio-draft-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
                    <input
                      value={d.title}
                      onChange={(e) => updateDraft(d.localId, { title: e.target.value })}
                      placeholder="Title"
                      style={{ ...inputStyle(), gridColumn: "1 / -1" }}
                    />
                    <select
                      value={d.gender}
                      onChange={(e) => updateDraft(d.localId, { gender: e.target.value, subCategory: GENDER_SUBCATEGORIES[e.target.value][0] })}
                      style={inputStyle()}
                    >
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                      <option value="kids">Kids</option>
                    </select>
                    <select value={d.subCategory} onChange={(e) => updateDraft(d.localId, { subCategory: e.target.value })} style={inputStyle()}>
                      {GENDER_SUBCATEGORIES[d.gender].map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={d.basePrice}
                      onChange={(e) => updateDraft(d.localId, { basePrice: Number(e.target.value) })}
                      placeholder="Price"
                      style={inputStyle()}
                    />
                    <input
                      type="number"
                      min={0}
                      value={d.compareAtPrice ?? ""}
                      onChange={(e) => updateDraft(d.localId, { compareAtPrice: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="MRP (optional)"
                      style={inputStyle()}
                    />
                    <input
                      value={d.fabric}
                      onChange={(e) => updateDraft(d.localId, { fabric: e.target.value })}
                      placeholder="Fabric"
                      style={inputStyle()}
                    />
                    <input
                      type="number"
                      min={0}
                      value={d.stockRemaining}
                      onChange={(e) => updateDraft(d.localId, { stockRemaining: Number(e.target.value) })}
                      placeholder="Stock"
                      style={inputStyle()}
                    />
                    <textarea
                      value={d.description}
                      onChange={(e) => updateDraft(d.localId, { description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      style={{ ...inputStyle(), gridColumn: "1 / -1", resize: "vertical" }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: DraftStatus }) {
  const map: Record<DraftStatus, { label: string; bg: string; fg: string }> = {
    queued: { label: "Queued", bg: "#f1f5f9", fg: "#64748b" },
    "removing-bg": { label: "Removing background…", bg: "#e0e7ff", fg: "#3730a3" },
    autofilling: { label: "AI thinking…", bg: "#faf5ff", fg: "#7c3aed" },
    ready: { label: "Ready to publish", bg: "#dcfce7", fg: "#16a34a" },
    publishing: { label: "Publishing…", bg: "#e0e7ff", fg: "#3730a3" },
    published: { label: "Published", bg: "#dcfce7", fg: "#16a34a" },
    error: { label: "Needs attention", bg: "#fee2e2", fg: "#dc2626" },
  };
  const s = map[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.fg }}>{s.label}</span>
  );
}

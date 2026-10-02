"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSellerStore } from "../../../../../lib/use-seller-store";
import { CATEGORY_TREE, COLOR_CATALOG, getSizeOptionsFor, defaultSizedSubCategoryFor, type Gender } from "../../../../../lib/catalog-constants";
import { autoAlignAndZoom, autoEnhanceQuality, stabilizeLighting, reduceWrinkles, cutoutFromMask } from "../../../../../lib/image-enhance";
import { showToast } from "../../../../../lib/toast";

const GENDER_SUBCATEGORIES: Record<string, string[]> = Object.fromEntries(CATEGORY_TREE.map((c) => [c.value, c.subCategories]));

type DraftStatus = "queued" | "removing-bg" | "autofilling" | "ready" | "publishing" | "published" | "error";

const MAX_ADDITIONAL_IMAGES = 4;

interface Draft {
  localId: string;
  fileName: string;
  originalImage: string;
  image: string;
  // Extra angles (back, side, close-up) of the same product - unlike `image`,
  // these skip the free enhancement pipeline (no bg removal/align/lighting):
  // that pipeline runs once per draft during Process All, before these can
  // even be added, so re-running it per additional photo would mean a
  // second heavy segmentation pass per photo. Same tradeoff the single-
  // product form already makes for its own "Additional Photos".
  additionalImages: string[];
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
  costPrice: number | undefined;
  stockRemaining: number;
  color: string | undefined;
  // Shared across every draft linked together as "same product, different
  // colors" (see handleLinkAsColorVariants) - same meaning as Product's own
  // colorGroupId, letting the storefront show these as swatches of one
  // listing instead of unrelated products once published.
  colorGroupId: string | undefined;
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

  // "Apply to all" bar - every field starts blank/untouched so applying
  // never clobbers a draft's own value unless the seller actually typed
  // something here. Lets a seller who just uploaded a uniform batch (e.g.
  // 10 sarees at the same price) set it once instead of retyping it on
  // every single ready draft.
  const [bulkGender, setBulkGender] = useState("");
  const [bulkSubCategory, setBulkSubCategory] = useState("");
  const [bulkFabric, setBulkFabric] = useState("");
  const [bulkBasePrice, setBulkBasePrice] = useState("");
  const [bulkCompareAtPrice, setBulkCompareAtPrice] = useState("");
  const [bulkCostPrice, setBulkCostPrice] = useState("");
  const [bulkStockRemaining, setBulkStockRemaining] = useState("");

  // Lets a seller pick a whole mixed batch in one file dialog - some photos
  // of the same product, others of different products - then sort it out
  // here: check the photos that are really the same product and merge them
  // into a single draft, leaving everything else as its own product.
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

  function toggleMergeSelect(localId: string) {
    setSelectedForMerge((ids) => (ids.includes(localId) ? ids.filter((id) => id !== localId) : [...ids, localId]));
  }

  function handleMergeSelected() {
    const selected = drafts.filter((d) => selectedForMerge.includes(d.localId));
    if (selected.length < 2) return;
    const [primary, ...rest] = selected;
    const combinedExtras = [primary.additionalImages, ...rest.map((d) => [d.image, ...d.additionalImages])].flat();
    const truncated = combinedExtras.length > MAX_ADDITIONAL_IMAGES;
    const merged: Draft = { ...primary, additionalImages: combinedExtras.slice(0, MAX_ADDITIONAL_IMAGES) };

    setDrafts((ds) => ds.map((d) => (d.localId === primary.localId ? merged : d)).filter((d) => !rest.some((r) => r.localId === d.localId)));
    setSelectedForMerge([]);
    showToast(
      truncated
        ? `Merged into one product — only kept the first ${MAX_ADDITIONAL_IMAGES + 1} photos.`
        : `Merged ${selected.length} photos into one product.`,
      "success"
    );
  }

  // Unlike merging, each photo stays its own draft/product - they just share
  // a colorGroupId (and the first draft's title/category/price/etc, which
  // the seller can still tweak per draft after) so the storefront shows
  // them as swatches of one listing, the same as picking multiple colors in
  // the single-product form does.
  function handleLinkAsColorVariants() {
    const selected = drafts.filter((d) => selectedForMerge.includes(d.localId));
    if (selected.length < 2) return;
    const primary = selected[0];
    const colorGroupId = `cg-bulk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const selectedIds = new Set(selected.map((d) => d.localId));
    setDrafts((ds) =>
      ds.map((d) => {
        if (!selectedIds.has(d.localId)) return d;
        if (d.localId === primary.localId) return { ...d, colorGroupId };
        return {
          ...d,
          colorGroupId,
          title: primary.title,
          gender: primary.gender,
          subCategory: primary.subCategory,
          fabric: primary.fabric,
          description: primary.description,
          basePrice: primary.basePrice,
          compareAtPrice: primary.compareAtPrice,
          costPrice: primary.costPrice,
        };
      })
    );
    setSelectedForMerge([]);
    showToast(`Linked ${selected.length} photos as color variants of one product — set each one's color below.`, "success");
  }

  function updateDraft(localId: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.localId === localId ? { ...d, ...patch } : d)));
  }

  function handleApplyToAll() {
    const applyCount = drafts.filter((d) => d.status === "ready").length;
    setDrafts((ds) =>
      ds.map((d) => {
        if (d.status !== "ready") return d;
        const patch: Partial<Draft> = {};
        if (bulkGender) {
          patch.gender = bulkGender;
          patch.subCategory = bulkSubCategory || defaultSizedSubCategoryFor(bulkGender as Gender);
        } else if (bulkSubCategory && GENDER_SUBCATEGORIES[d.gender]?.includes(bulkSubCategory)) {
          patch.subCategory = bulkSubCategory;
        }
        if (bulkFabric) patch.fabric = bulkFabric;
        if (bulkBasePrice !== "") patch.basePrice = Number(bulkBasePrice);
        if (bulkCompareAtPrice !== "") patch.compareAtPrice = Number(bulkCompareAtPrice);
        if (bulkCostPrice !== "") patch.costPrice = Number(bulkCostPrice);
        if (bulkStockRemaining !== "") patch.stockRemaining = Number(bulkStockRemaining);
        return { ...d, ...patch };
      })
    );
    showToast(`Applied to ${applyCount} draft${applyCount === 1 ? "" : "s"}.`, "success");
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
        additionalImages: [],
        bgRemoved: false,
        status: "queued",
        error: "",
        title: "",
        gender: "women",
        subCategory: defaultSizedSubCategoryFor("women"),
        fabric: "",
        description: "",
        basePrice: 999,
        compareAtPrice: undefined,
        costPrice: undefined,
        stockRemaining: 10,
        color: undefined,
        colorGroupId: undefined,
      });
    }
    setDrafts((ds) => [...ds, ...newDrafts]);
  }

  function removeDraft(localId: string) {
    setDrafts((ds) => ds.filter((d) => d.localId !== localId));
    setSelectedForMerge((ids) => ids.filter((id) => id !== localId));
  }

  // Lets a seller attach extra angles (back, side, close-up) of the same
  // product to a draft that's already been through Process All - the same
  // "Additional Photos" pattern as the single-product form, just scoped to
  // one draft in a batch instead of the one product on that page.
  async function handleAdditionalPhotosChange(localId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const draft = drafts.find((d) => d.localId === localId);
    if (!draft) return;
    const room = MAX_ADDITIONAL_IMAGES - draft.additionalImages.length;
    if (room <= 0) return;

    const accepted: string[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) continue;
      accepted.push(await fileToDataUrl(file));
    }
    if (accepted.length > 0) {
      updateDraft(localId, { additionalImages: [...draft.additionalImages, ...accepted] });
    }
  }

  function removeAdditionalImage(localId: string, index: number) {
    setDrafts((ds) =>
      ds.map((d) => (d.localId === localId ? { ...d, additionalImages: d.additionalImages.filter((_, i) => i !== index) } : d))
    );
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
        )) as {
          removeBackground: (image: string, config?: { model?: string; output?: { format?: string; type?: string } }) => Promise<Blob>;
        };
        // isnet_fp16, not the smaller isnet_quint8 - see ProductForm.tsx's
        // handleRemoveBackground for why (quint8 is documented as
        // occasionally artifact-prone, and reproduced one on a real photo).
        const maskBlob = await removeBackground(smoothedInput, { model: "isnet_fp16", output: { format: "image/png", type: "mask" } });
        const maskUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(maskBlob);
        });
        const cutoutUrl = await cutoutFromMask(smoothedInput, maskUrl);
        currentImage = await autoAlignAndZoom(cutoutUrl).catch(() => cutoutUrl);
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
          subCategory: result.subCategory ?? defaultSizedSubCategoryFor((result.gender ?? "women") as Gender),
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
              // Matches the single-product form's own "multiple colors"
              // behavior - the color is appended to the title so two
              // variants of the same product don't publish with identical
              // titles.
              title: d.colorGroupId && d.color ? `${d.title || d.fileName} — ${d.color}` : d.title || d.fileName,
              description: d.description,
              fabric: d.fabric,
              gender: d.gender,
              subCategory: d.subCategory,
              basePrice: d.basePrice,
              compareAtPrice: d.compareAtPrice,
              costPrice: d.costPrice,
              stockRemaining: d.stockRemaining,
              color: d.color,
              colorGroupId: d.colorGroupId,
              // No size picker in this quick-publish flow - default to every
              // size valid for the category (e.g. all shoe sizes for
              // Footwear) rather than "Free Size" for everything, which was
              // wrong for any category that isn't genuinely one-size. The
              // seller can narrow it down later via Edit.
              sizes: getSizeOptionsFor(d.subCategory),
              images: [{ url: d.image }, ...d.additionalImages.map((url) => ({ url }))],
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
        Upload several raw product photos at once for {store.name} — mix photos of different products and multiple angles of the same
        product in one go. Each photo becomes its own product by default, automatically getting its background removed, centered, and
        zoomed to fill the frame (free), plus a title, category, and description suggested by AI. If a few photos are really the same
        product, check them below and merge them into one before publishing.
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

      {readyCount > 0 && (
        <div
          className="sio-card"
          style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24 }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Apply to all</label>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            Set any field here and apply it to every ready draft at once — leave a field blank to leave that field untouched on each
            draft. Handy when a whole batch is the same category, price, or fabric.
          </p>
          <div className="sio-draft-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
            <select
              value={bulkGender}
              onChange={(e) => {
                setBulkGender(e.target.value);
                setBulkSubCategory("");
              }}
              style={inputStyle()}
            >
              <option value="">Gender (unchanged)</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="kids">Kids</option>
            </select>
            <select value={bulkSubCategory} onChange={(e) => setBulkSubCategory(e.target.value)} style={inputStyle()} disabled={!bulkGender}>
              <option value="">Category (unchanged)</option>
              {(bulkGender ? GENDER_SUBCATEGORIES[bulkGender] : []).map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </select>
            <input value={bulkFabric} onChange={(e) => setBulkFabric(e.target.value)} placeholder="Fabric (unchanged)" style={inputStyle()} />
            <input
              type="number"
              min={0}
              value={bulkBasePrice}
              onChange={(e) => setBulkBasePrice(e.target.value)}
              placeholder="Price (unchanged)"
              style={inputStyle()}
            />
            <input
              type="number"
              min={0}
              value={bulkCompareAtPrice}
              onChange={(e) => setBulkCompareAtPrice(e.target.value)}
              placeholder="MRP (unchanged)"
              style={inputStyle()}
            />
            <input
              type="number"
              min={0}
              value={bulkCostPrice}
              onChange={(e) => setBulkCostPrice(e.target.value)}
              placeholder="Cost price (unchanged)"
              style={inputStyle()}
            />
            <input
              type="number"
              min={0}
              value={bulkStockRemaining}
              onChange={(e) => setBulkStockRemaining(e.target.value)}
              placeholder="Stock (unchanged)"
              style={inputStyle()}
            />
          </div>
          <button
            type="button"
            onClick={handleApplyToAll}
            disabled={!bulkGender && !bulkFabric && bulkBasePrice === "" && bulkCompareAtPrice === "" && bulkCostPrice === "" && bulkStockRemaining === ""}
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background:
                !bulkGender && !bulkFabric && bulkBasePrice === "" && bulkCompareAtPrice === "" && bulkCostPrice === "" && bulkStockRemaining === ""
                  ? "#94a3b8"
                  : "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor:
                !bulkGender && !bulkFabric && bulkBasePrice === "" && bulkCompareAtPrice === "" && bulkCostPrice === "" && bulkStockRemaining === ""
                  ? "default"
                  : "pointer",
            }}
          >
            Apply to {readyCount} Ready Draft{readyCount === 1 ? "" : "s"}
          </button>
        </div>
      )}

      {selectedForMerge.length >= 2 && (
        <div
          className="sio-fade-in"
          style={{
            position: "sticky",
            top: 12,
            zIndex: 5,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#0f172a",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>
            {selectedForMerge.length} photos selected — same product (multiple angles), different colors of it, or unrelated?
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setSelectedForMerge([])}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLinkAsColorVariants}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Same Product, Different Colors
            </button>
            <button
              type="button"
              onClick={handleMergeSelected}
              style={{ background: "#7c3aed", border: "none", color: "#fff", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Merge into One Product
            </button>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {drafts.map((d) => {
            const mergeable = d.status === "queued" || d.status === "error" || d.status === "ready";
            return (
            <div
              key={d.localId}
              className="sio-card sio-draft-row"
              style={{
                display: "flex",
                gap: 16,
                background: "#fff",
                borderRadius: 14,
                border: selectedForMerge.includes(d.localId) ? "2px solid #7c3aed" : "1px solid #f1f5f9",
                padding: 16,
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                {mergeable && drafts.filter((o) => o.status === "queued" || o.status === "error" || o.status === "ready").length > 1 && (
                  <input
                    type="checkbox"
                    checked={selectedForMerge.includes(d.localId)}
                    onChange={() => toggleMergeSelect(d.localId)}
                    aria-label="Select for merging into one product"
                    style={{
                      position: "absolute",
                      top: -8,
                      left: -8,
                      width: 18,
                      height: 18,
                      zIndex: 1,
                      cursor: "pointer",
                    }}
                  />
                )}
                <img
                  className="sio-draft-thumb"
                  src={d.image}
                  alt={d.fileName}
                  style={{ width: 80, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <StatusBadge status={d.status} />
                    {d.colorGroupId && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "#7c3aed",
                          background: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          borderRadius: 999,
                          padding: "2px 8px",
                        }}
                      >
                        🎨 Color variant — {drafts.filter((o) => o.colorGroupId === d.colorGroupId).length} linked
                      </span>
                    )}
                  </div>
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
                      onChange={(e) => updateDraft(d.localId, { gender: e.target.value, subCategory: defaultSizedSubCategoryFor(e.target.value as Gender) })}
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
                      type="number"
                      min={0}
                      value={d.costPrice ?? ""}
                      onChange={(e) => updateDraft(d.localId, { costPrice: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Cost price (optional)"
                      style={inputStyle()}
                    />
                    <input
                      value={d.fabric}
                      onChange={(e) => updateDraft(d.localId, { fabric: e.target.value })}
                      placeholder="Fabric"
                      style={inputStyle()}
                    />
                    <select value={d.color ?? ""} onChange={(e) => updateDraft(d.localId, { color: e.target.value || undefined })} style={inputStyle()}>
                      <option value="">Color (optional)</option>
                      {COLOR_CATALOG.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                        More photos of this product (back, side, close-up)
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: d.additionalImages.length > 0 ? 8 : 0 }}>
                        {d.additionalImages.map((img, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img
                              src={img}
                              alt={`${d.fileName} extra angle ${i + 1}`}
                              style={{ width: 48, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }}
                            />
                            <button
                              type="button"
                              onClick={() => removeAdditionalImage(d.localId, i)}
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
                                fontSize: 11,
                                lineHeight: "18px",
                                textAlign: "center",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {d.additionalImages.length < MAX_ADDITIONAL_IMAGES && (
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAdditionalPhotosChange(d.localId, e)}
                          style={{ fontSize: 11, width: "100%", maxWidth: "100%" }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
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

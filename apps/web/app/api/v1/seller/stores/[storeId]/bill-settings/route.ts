import { NextRequest, NextResponse } from "next/server";
import { stores, getBillingSettings, updateBillingSettings } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  return NextResponse.json(getBillingSettings(store.id));
}

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_input", message: "Malformed request body." }, { status: 400 });
  }

  const errors: string[] = [];
  const patch: { mode?: "gst" | "normal"; gstin?: string; taxRatePercent?: number } = {};

  if (body.mode !== undefined) {
    if (body.mode !== "gst" && body.mode !== "normal") {
      errors.push("mode must be 'gst' or 'normal'");
    } else {
      patch.mode = body.mode;
    }
  }

  if (body.taxRatePercent !== undefined) {
    const rate = Number(body.taxRatePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 40) {
      errors.push("taxRatePercent must be a number between 0 and 40");
    } else {
      patch.taxRatePercent = rate;
    }
  }

  // GSTIN is only meaningful (and only validated) when GST mode is active -
  // a seller who's about to switch to "normal" shouldn't be blocked by a
  // GSTIN field they're not even using anymore.
  const effectiveMode = patch.mode ?? getBillingSettings(store.id).mode;
  if (body.gstin !== undefined) {
    const gstin = typeof body.gstin === "string" ? body.gstin.trim().toUpperCase() : "";
    if (effectiveMode === "gst" && !GSTIN_PATTERN.test(gstin)) {
      errors.push("gstin must be a valid 15-character GSTIN");
    } else {
      patch.gstin = gstin || undefined;
    }
  }

  if (effectiveMode === "gst" && !patch.gstin && !getBillingSettings(store.id).gstin) {
    errors.push("gstin is required to enable GST invoicing");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "invalid_input", errors }, { status: 400 });
  }

  const settings = updateBillingSettings(store.id, patch);
  return NextResponse.json(settings);
}

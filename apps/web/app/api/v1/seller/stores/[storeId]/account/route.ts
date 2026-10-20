import { NextRequest, NextResponse } from "next/server";
import { getAllStores, updateStoreAccountDetails } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z][Z][0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const BUSINESS_TYPES = ["proprietorship", "partnership", "pvt_ltd", "llp"];

// The Account page's own "edit my details afterward" endpoint - unlike
// submit-for-review (only reachable from "draft"), this works from any
// store status, since fixing a typo'd GSTIN or phone number shouldn't need
// the site owner's help. GET just returns the current store object (every
// field here is a plain stores column, none of it as sensitive as the
// Gemini key, so this reuses the full Store shape rather than a narrow
// projection).
export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  return NextResponse.json(store);
}

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_input", message: "Malformed request body." }, { status: 400 });
  }

  const errors: string[] = [];
  const patch: {
    legalBusinessName?: string;
    businessType?: string;
    gstin?: string;
    pan?: string;
    upiVpa?: string;
    phone?: string;
    email?: string;
  } = {};

  if (body.legalBusinessName !== undefined) {
    const name = typeof body.legalBusinessName === "string" ? body.legalBusinessName.trim() : "";
    if (!name || name.length > 160) errors.push("legalBusinessName must be a non-empty string up to 160 characters");
    else patch.legalBusinessName = name;
  }

  if (body.businessType !== undefined) {
    if (!BUSINESS_TYPES.includes(body.businessType)) errors.push(`businessType must be one of ${BUSINESS_TYPES.join(", ")}`);
    else patch.businessType = body.businessType;
  }

  // GSTIN/PAN stay optional (not every seller is GST-registered, and PAN
  // isn't re-verified here any more than it was at onboarding) - only
  // validated for format when the seller actually provides a non-empty
  // value; an empty string clears the field.
  if (body.gstin !== undefined) {
    const gstin = typeof body.gstin === "string" ? body.gstin.trim().toUpperCase() : "";
    if (gstin && !GSTIN_PATTERN.test(gstin)) errors.push("gstin must be a valid 15-character GSTIN, or blank to clear it");
    else patch.gstin = gstin;
  }

  if (body.pan !== undefined) {
    const pan = typeof body.pan === "string" ? body.pan.trim().toUpperCase() : "";
    if (pan && !PAN_PATTERN.test(pan)) errors.push("pan must be a valid 10-character PAN, or blank to clear it");
    else patch.pan = pan;
  }

  if (body.upiVpa !== undefined) {
    const upi = typeof body.upiVpa === "string" ? body.upiVpa.trim() : "";
    if (upi && !upi.includes("@")) errors.push("upiVpa must look like name@bank, or blank to clear it");
    else patch.upiVpa = upi;
  }

  if (body.phone !== undefined) {
    const digits = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    if (digits && digits.length < 10) errors.push("phone must have at least 10 digits, or blank to clear it");
    else patch.phone = digits;
  }

  if (body.email !== undefined) {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (email && !EMAIL_PATTERN.test(email)) errors.push("email must be a valid email address, or blank to clear it");
    else patch.email = email;
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "invalid_input", errors }, { status: 400 });
  }

  const updated = await updateStoreAccountDetails(store.id, patch);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}

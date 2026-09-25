import { NextRequest, NextResponse } from "next/server";
import { upsertShopper } from "../../../../../lib/seed-data";

const VALID_CATEGORIES = new Set(["men", "women", "kids"]);

// Saves the profile a first-time customer fills in right after OTP
// verification (name, optional email, preferred category, home pincode),
// or updates it on a later sign-in. Called once per sign-in, right after
// /api/v1/auth/otp/verify succeeds.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "invalid_request", message: "name is required." }, { status: 400 });
  }
  if (typeof body.phone !== "string" || !/^\d{10}$/.test(body.phone)) {
    return NextResponse.json({ error: "invalid_request", message: "A valid 10-digit phone is required." }, { status: 400 });
  }
  if (body.email !== undefined && body.email !== null && body.email !== "" && typeof body.email !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "email must be a string." }, { status: 400 });
  }
  if (body.preferredCategory !== undefined && body.preferredCategory !== null && body.preferredCategory !== "" && !VALID_CATEGORIES.has(body.preferredCategory)) {
    return NextResponse.json({ error: "invalid_request", message: "preferredCategory must be men, women, or kids." }, { status: 400 });
  }
  if (body.pincode !== undefined && body.pincode !== null && body.pincode !== "" && !/^\d{6}$/.test(body.pincode)) {
    return NextResponse.json({ error: "invalid_request", message: "pincode must be 6 digits." }, { status: 400 });
  }

  const { shopper, isNewCustomer } = upsertShopper({
    name: body.name,
    phone: body.phone,
    email: body.email || undefined,
    preferredCategory: body.preferredCategory || undefined,
    pincode: body.pincode || undefined,
  });

  return NextResponse.json({ ok: true, shopper, isNewCustomer });
}

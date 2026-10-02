import { NextRequest, NextResponse } from "next/server";
import { upsertShopper } from "../../../../../lib/seed-data";
import { validatePassword } from "../../../../../lib/validate-password";

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
  if (body.city !== undefined && body.city !== null && body.city !== "" && (typeof body.city !== "string" || body.city.length > 100)) {
    return NextResponse.json({ error: "invalid_request", message: "city must be a string of 100 characters or fewer." }, { status: 400 });
  }
  if (body.dateOfBirth !== undefined && body.dateOfBirth !== null && body.dateOfBirth !== "") {
    const dob = new Date(body.dateOfBirth);
    if (typeof body.dateOfBirth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) || Number.isNaN(dob.getTime()) || dob > new Date()) {
      return NextResponse.json({ error: "invalid_request", message: "dateOfBirth must be a valid past date (YYYY-MM-DD)." }, { status: 400 });
    }
  }
  if (body.marketingOptIn !== undefined && body.marketingOptIn !== null && typeof body.marketingOptIn !== "boolean") {
    return NextResponse.json({ error: "invalid_request", message: "marketingOptIn must be a boolean." }, { status: 400 });
  }
  if (body.password !== undefined && body.password !== null && body.password !== "") {
    const { errors } = validatePassword(body.password);
    if (errors.length > 0) return NextResponse.json({ error: "invalid_request", message: errors.join(" ") }, { status: 400 });
  }

  const { shopper, isNewCustomer } = upsertShopper({
    name: body.name,
    phone: body.phone,
    email: body.email || undefined,
    preferredCategory: body.preferredCategory || undefined,
    pincode: body.pincode || undefined,
    city: body.city || undefined,
    dateOfBirth: body.dateOfBirth || undefined,
    marketingOptIn: typeof body.marketingOptIn === "boolean" ? body.marketingOptIn : undefined,
    password: body.password || undefined,
    referredByCode: typeof body.referredByCode === "string" ? body.referredByCode : undefined,
  });

  // passwordHash never leaves the server - everything else about the
  // shopper record is already fine to hand back (it's this same shopper's
  // own profile).
  const { passwordHash: _passwordHash, ...safeShopper } = shopper;
  return NextResponse.json({ ok: true, shopper: safeShopper, isNewCustomer });
}

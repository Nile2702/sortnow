import { NextRequest, NextResponse } from "next/server";
import { upsertShopper, findShopperByPhone } from "../../../../../lib/seed-data";
import { validatePassword } from "../../../../../lib/validate-password";
import { consumeEmailVerification } from "../../../../../lib/otp";

const VALID_CATEGORIES = new Set(["men", "women", "kids"]);
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Saves the profile a first-time customer fills in right after OTP
// verification (name, phone, preferred category, home pincode), or updates
// it on a later sign-in. Called once per sign-in, right after
// /api/v1/auth/otp/verify succeeds with no existingShopper for this email.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "invalid_request", message: "name is required." }, { status: 400 });
  }
  if (typeof body.phone !== "string" || !/^\d{10}$/.test(body.phone)) {
    return NextResponse.json({ error: "invalid_request", message: "A valid 10-digit phone is required." }, { status: 400 });
  }
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "invalid_request", message: "A valid email is required." }, { status: 400 });
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

  // Proof the caller actually just verified an OTP for this exact email -
  // without this, anyone could POST any email here and rewrite that
  // shopper's name or set a login password for their account, since
  // upsertShopper trusts whatever phone the request claims. Single-use,
  // consumed here, same lifetime as the OTP verification it rides on.
  if (!consumeEmailVerification(body.email)) {
    return NextResponse.json(
      { error: "not_verified", message: "Verify your email with an OTP before saving a profile." },
      { status: 401 }
    );
  }

  // The phone number itself was never proven here - only the email was, via
  // OTP above. If it already belongs to a different account, upsertShopper's
  // "existing phone" branch would otherwise silently rename that account and
  // hand back a live session for it with zero proof of ownership - same risk
  // /api/v1/auth/google already guards against for its own phone-collection
  // step. A phone that belongs to THIS same verified email is fine (e.g.
  // re-submitting after a network hiccup) - that's just this shopper's own
  // existing record.
  const phoneOwner = await findShopperByPhone(body.phone);
  if (phoneOwner && phoneOwner.email?.toLowerCase() !== body.email.toLowerCase()) {
    return NextResponse.json(
      { error: "phone_taken", message: "This number already has an account. Log in with that account's email instead." },
      { status: 409 }
    );
  }

  const { shopper, isNewCustomer } = await upsertShopper({
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

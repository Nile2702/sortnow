import { NextRequest, NextResponse } from "next/server";
import { verifyEmailOtp } from "../../../../../../lib/otp";
import { findShopperByEmail } from "../../../../../../lib/seed-data";

// Verifies the code - the shopper "session" itself stays client-side
// (lib/shopper-session.ts, localStorage), same as before this endpoint
// existed. Also looks up any existing server-side profile for this email
// (see lib/seed-data.ts Shopper) so the sign-in page can tell a genuinely
// first-time customer (no account yet - needs a phone number next, see
// /api/v1/shopper/profile) apart from one returning on a device whose
// localStorage was cleared (existingShopper already has everything,
// including the phone this page never had to ask for again).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "email and code are required." }, { status: 400 });
  }

  const valid = verifyEmailOtp(body.email, body.code);
  if (!valid) {
    return NextResponse.json({ error: "invalid_otp", message: "Incorrect or expired OTP." }, { status: 401 });
  }

  const existing = await findShopperByEmail(body.email);
  // passwordHash never leaves the server, same reasoning as the profile
  // endpoint - the client only ever needs to know a password exists, not
  // its hash.
  const safeExisting = existing ? (({ passwordHash: _passwordHash, ...rest }) => rest)(existing) : null;
  return NextResponse.json({ ok: true, existingShopper: safeExisting });
}

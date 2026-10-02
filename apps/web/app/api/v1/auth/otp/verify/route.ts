import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "../../../../../../lib/otp";
import { findShopperByPhone } from "../../../../../../lib/seed-data";

// Verifies the code - the shopper "session" itself stays client-side
// (lib/shopper-session.ts, localStorage), same as before this endpoint
// existed. This just replaces the old hardcoded-demo-OTP check with a real
// per-phone, single-use, expiring code. Also looks up any existing
// server-side profile for this phone (see lib/seed-data.ts Shopper) so the
// sign-in page can tell a genuinely first-time customer apart from one
// returning on a device whose localStorage was cleared.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "phone and code are required." }, { status: 400 });
  }

  const valid = verifyOtp(body.phone, body.code);
  if (!valid) {
    return NextResponse.json({ error: "invalid_otp", message: "Incorrect or expired OTP." }, { status: 401 });
  }

  const existing = findShopperByPhone(body.phone);
  // passwordHash never leaves the server, same reasoning as the profile
  // endpoint - the client only ever needs to know a password exists, not
  // its hash.
  const safeExisting = existing ? (({ passwordHash: _passwordHash, ...rest }) => rest)(existing) : null;
  return NextResponse.json({ ok: true, existingShopper: safeExisting });
}

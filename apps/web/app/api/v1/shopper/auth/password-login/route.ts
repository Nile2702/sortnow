import { NextRequest, NextResponse } from "next/server";
import { verifyShopperPassword } from "../../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";

// Alternative to OTP for a shopper who set a password during signup - pure
// convenience (skip the SMS wait), never the only way in: a shopper who
// never set one, or forgot it, can always fall back to
// /api/v1/auth/otp/request + verify instead. No shopper session cookie
// exists (see shopper/profile's own note on that) - same client-supplied-
// phone trust model as the rest of the shopper side of this demo, this
// endpoint just replaces "enter the OTP" with "enter the password" as the
// proof-of-identity step before the client stores its localStorage session.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "phone and password are required." }, { status: 400 });
  }

  // 10 attempts per 5 minutes per IP+phone, same budget as seller login.
  const { ok, retryAfterMs } = rateLimit(`shopper-password-login:${clientIp(req)}:${body.phone}`, 10, 5 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const shopper = verifyShopperPassword(body.phone, body.password);
  if (!shopper) {
    return NextResponse.json({ error: "invalid_credentials", message: "Incorrect phone or password." }, { status: 401 });
  }

  // passwordHash never leaves the server.
  const { passwordHash: _passwordHash, ...safeShopper } = shopper;
  return NextResponse.json({ ok: true, shopper: safeShopper });
}

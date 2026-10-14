import { NextRequest, NextResponse } from "next/server";
import { findShopperByPhone, getReferralCount } from "../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

// Same client-supplied-phone trust model as the rest of the shopper side of
// this app (waitlist, reservations) - there's no real shopper session token,
// only the seller side has a signed cookie, so this can't verify the caller
// actually owns `phone`. Rate-limited per caller IP to at least stop someone
// from mass-enumerating phone numbers against this endpoint to find out
// which ones have an account (a real shopper session/auth model would be
// the complete fix, but that's a bigger architecture change than this
// endpoint on its own).
export async function GET(req: NextRequest) {
  const limit = rateLimit(`referrals:${clientIp(req)}`, 20, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const phone = new URL(req.url).searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "invalid_request", message: "phone is required." }, { status: 400 });

  const shopper = await findShopperByPhone(phone);
  if (!shopper) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ referralCode: shopper.referralCode, count: await getReferralCount(shopper.id) });
}

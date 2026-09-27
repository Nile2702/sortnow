import { NextRequest, NextResponse } from "next/server";
import { findShopperByPhone, getReferralCount } from "../../../../../lib/seed-data";

// Same client-supplied-phone trust model as the rest of the shopper side of
// this demo (waitlist, reservations) - there's no real shopper session
// token, only the seller side has a signed cookie.
export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "invalid_request", message: "phone is required." }, { status: 400 });

  const shopper = findShopperByPhone(phone);
  if (!shopper) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ referralCode: shopper.referralCode, count: getReferralCount(shopper.id) });
}

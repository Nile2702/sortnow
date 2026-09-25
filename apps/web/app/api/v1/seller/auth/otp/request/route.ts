import { NextRequest, NextResponse } from "next/server";
import { findStoreByPhone } from "../../../../../../../lib/seed-data";
import { requestOtp } from "../../../../../../../lib/otp";
import { rateLimit, clientIp } from "../../../../../../../lib/rate-limit";

// Unlike the shopper OTP endpoint, this only sends a code if the phone is
// actually registered to a store - a random phone number gets no OTP at
// all. (The devOtp echo below - necessary only because no real SMS
// gateway exists yet - does mean an unregistered phone is distinguishable
// by the response shape in this demo; that goes away entirely once
// sendSms() in lib/otp.ts is replaced with a real provider and devOtp is
// removed.)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "A phone number is required." }, { status: 400 });
  }

  const { ok, retryAfterMs } = rateLimit(`seller-otp-request:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const store = findStoreByPhone(body.phone);
  if (!store) {
    // Same shape as the success case - don't leak whether this phone
    // number is registered to a seller account.
    return NextResponse.json({ ok: true });
  }

  const result = requestOtp(body.phone);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_request", message: result.error }, { status: 400 });
  }

  // devOtp is only present because no real SMS gateway is wired up yet -
  // see lib/otp.ts.
  return NextResponse.json({ ok: true, devOtp: result.devOtp });
}

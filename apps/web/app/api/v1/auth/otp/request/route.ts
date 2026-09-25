import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "../../../../../../lib/otp";

// Shopper-facing OTP request - unlike the seller version, this doesn't
// require the phone to already belong to a registered account. Anyone
// browsing this marketplace can create a lightweight account just by
// verifying a phone number, same as most consumer apps' "log in with OTP".
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "A phone number is required." }, { status: 400 });
  }

  const result = requestOtp(body.phone);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_request", message: result.error }, { status: 400 });
  }

  // devOtp is only present because no real SMS gateway is wired up yet -
  // see lib/otp.ts. A real deployment would drop this field entirely.
  return NextResponse.json({ ok: true, devOtp: result.devOtp });
}

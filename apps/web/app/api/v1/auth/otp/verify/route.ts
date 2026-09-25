import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "../../../../../../lib/otp";

// Verifies the code only - the shopper "session" itself stays client-side
// (lib/shopper-session.ts, localStorage), same as before this endpoint
// existed. This just replaces the old hardcoded-demo-OTP check with a real
// per-phone, single-use, expiring code.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "phone and code are required." }, { status: 400 });
  }

  const valid = verifyOtp(body.phone, body.code);
  if (!valid) {
    return NextResponse.json({ error: "invalid_otp", message: "Incorrect or expired OTP." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requestEmailOtp } from "../../../../../../lib/otp";

// Shopper-facing OTP request - unlike the seller version, this doesn't
// require the email to already belong to a registered account. Anyone
// browsing this marketplace can create a lightweight account just by
// verifying an email, same as most consumer apps' "log in with a code".
// Email (not phone) is the identifier here - a shopper's phone number is
// only collected afterwards, on first signup (see /api/v1/shopper/profile),
// since reservations/notifications/pickup still need one on file.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "An email address is required." }, { status: 400 });
  }

  const result = requestEmailOtp(body.email);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_request", message: result.error }, { status: 400 });
  }

  // devOtp is only present because no real email provider is configured yet
  // - see lib/email.ts. A real deployment (RESEND_API_KEY set) drops this
  // field entirely.
  return NextResponse.json({ ok: true, devOtp: result.devOtp });
}

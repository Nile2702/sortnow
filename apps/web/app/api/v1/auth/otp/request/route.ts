import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "../../../../../../lib/otp";
import { findShopperByPhone, updateShopperEmail } from "../../../../../../lib/seed-data";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Shopper-facing OTP request - unlike the seller version, this doesn't
// require the phone to already belong to a registered account. Anyone
// browsing this marketplace can create a lightweight account just by
// verifying a phone number, same as most consumer apps' "log in with OTP".
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "A phone number is required." }, { status: 400 });
  }

  // OTP delivery is by email now (see lib/otp.ts / lib/email.ts). A
  // returning shopper's email on file (if any) is used automatically; a
  // brand-new shopper, or one who signed up before email existed, is asked
  // for one by the login UI and it's remembered from here on (a brand-new
  // shopper's email gets saved properly moments later via the profile step
  // in /api/v1/shopper/profile - this just needs somewhere to send the code
  // to right now).
  const existing = await findShopperByPhone(body.phone);
  const providedEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = existing?.email || providedEmail;
  if (!email) {
    return NextResponse.json(
      { error: "email_required", message: "Enter an email address to receive your OTP." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_input", message: "Enter a valid email address." }, { status: 400 });
  }
  if (existing && !existing.email && providedEmail) {
    // Best-effort, same reasoning as the seller OTP route - remembering the
    // email is a convenience, never a precondition for this OTP going out.
    try {
      await updateShopperEmail(existing.id, providedEmail);
    } catch (err) {
      console.error("[shopper-otp-request] Failed to save shopper email:", err);
    }
  }

  const result = requestOtp(body.phone, email);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_request", message: result.error }, { status: 400 });
  }

  // devOtp is only present because no real email provider is configured yet
  // - see lib/email.ts. A real deployment (RESEND_API_KEY set) drops this
  // field entirely.
  return NextResponse.json({ ok: true, devOtp: result.devOtp });
}

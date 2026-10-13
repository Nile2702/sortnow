import { NextRequest, NextResponse } from "next/server";
import { findStoreByPhone, updateStoreEmail } from "../../../../../../../lib/seed-data";
import { requestOtp } from "../../../../../../../lib/otp";
import { rateLimit, clientIp } from "../../../../../../../lib/rate-limit";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Unlike the shopper OTP endpoint, this only sends a code if the phone is
// actually registered to a store - a random phone number gets no OTP at
// all. (The devOtp echo below - necessary only because no real email
// provider is configured yet, see lib/email.ts - does mean an unregistered
// phone is distinguishable from a registered one with no email on file by
// response shape in this demo; that's an accepted tradeoff of a pilot with
// no SMS/DLT channel, and goes away once RESEND_API_KEY is set and devOtp
// stops being returned.)
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

  const store = await findStoreByPhone(body.phone);
  if (!store) {
    // Same shape as the success case - don't leak whether this phone
    // number is registered to a seller account.
    return NextResponse.json({ ok: true });
  }

  // OTP delivery is by email now (see lib/otp.ts / lib/email.ts) - a store
  // registered before this existed likely has no email on file yet, so the
  // login UI collects one inline and we remember it here so this only ever
  // has to happen once per store.
  const providedEmail = typeof body.email === "string" ? body.email.trim() : "";
  const email = store.email || providedEmail;
  if (!email) {
    return NextResponse.json(
      { error: "email_required", message: "Add an email address to receive your OTP - we'll remember it for next time." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_input", message: "Enter a valid email address." }, { status: 400 });
  }
  if (!store.email && providedEmail) {
    // Best-effort - remembering the email for next time is a convenience,
    // not a precondition for this OTP actually going out, so a failure here
    // (e.g. the `stores.email` column migration hasn't landed on this
    // deployment yet) must never block code delivery itself.
    try {
      await updateStoreEmail(store.id, providedEmail);
    } catch (err) {
      console.error("[seller-otp-request] Failed to save store email:", err);
    }
  }

  const result = requestOtp(body.phone, email);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_request", message: result.error }, { status: 400 });
  }

  // devOtp is only present because no real email provider is configured yet
  // - see lib/email.ts.
  return NextResponse.json({ ok: true, devOtp: result.devOtp });
}

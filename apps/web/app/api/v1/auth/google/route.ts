import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleIdToken } from "../../../../../lib/google-auth";
import { findShopperByGoogleId, findShopperByEmail, findShopperByPhone, linkShopperGoogleId, upsertShopper } from "../../../../../lib/seed-data";

// Backs "Continue with Google" on the shopper /account login page. Shoppers
// are keyed by phone number everywhere else in this codebase (reservations,
// notifications, the password-login path) and Google only ever hands back a
// verified email, never a phone - so this single endpoint covers three
// cases depending on what's already on file, all re-verifying the token
// fresh each call rather than trusting a client-held result between steps:
//
//   1. Returning Google sign-in (googleId already on file) -> log straight in.
//   2. A shopper who originally signed up by phone+OTP, whose email happens
//      to match this Google account -> link the two and log straight in.
//   3. Genuinely new to this phone/email combo -> no phone to build a
//      session with yet, so this returns needsPhone instead of a session;
//      the client then collects just a phone number (+ ToS agreement) and
//      calls back here a second time with it to finish creating the account.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.credential !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "A Google credential is required." }, { status: 400 });
  }

  const verified = await verifyGoogleIdToken(body.credential);
  if (!verified.ok) {
    const message =
      verified.reason === "not_configured"
        ? "Google sign-in isn't set up yet."
        : "Couldn't verify that Google sign-in. Try again.";
    return NextResponse.json({ error: verified.reason, message }, { status: 401 });
  }
  const { googleId, email, name } = verified.identity;

  const byGoogleId = await findShopperByGoogleId(googleId);
  if (byGoogleId) {
    const { passwordHash: _passwordHash, ...safe } = byGoogleId;
    return NextResponse.json({ ok: true, shopper: safe });
  }

  const byEmail = await findShopperByEmail(email);
  if (byEmail) {
    await linkShopperGoogleId(byEmail.id, googleId);
    const { passwordHash: _passwordHash, ...safe } = byEmail;
    return NextResponse.json({ ok: true, shopper: safe });
  }

  // No existing account - need a phone number to create one. The client
  // sends it back in a second call rather than this endpoint remembering
  // anything server-side between requests.
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return NextResponse.json({ ok: true, needsPhone: true, googleName: name, googleEmail: email });
  }
  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "invalid_input", message: "Enter a valid 10-digit mobile number." }, { status: 400 });
  }
  if (!body.agreed) {
    return NextResponse.json(
      { error: "agreement_required", message: "Please accept the Terms & Privacy Policy to continue." },
      { status: 400 }
    );
  }

  // This phone number was never actually proven to belong to whoever's
  // sitting at this browser - Google only vouches for the email. If it
  // already belongs to a different account, upsertShopper's "existing
  // phone" branch would otherwise silently rename that account and hand
  // back a live session for it with zero proof of ownership. Phone+OTP
  // (or password) login is the only path allowed to touch an existing
  // phone record; this one is for creating a brand-new account only.
  const phoneTaken = await findShopperByPhone(phone);
  if (phoneTaken) {
    return NextResponse.json(
      { error: "phone_taken", message: "This number already has an account. Log in with OTP or your password instead." },
      { status: 409 }
    );
  }

  const { shopper } = await upsertShopper({ name, phone, email, googleId });
  const { passwordHash: _passwordHash, ...safe } = shopper;
  return NextResponse.json({ ok: true, shopper: safe });
}

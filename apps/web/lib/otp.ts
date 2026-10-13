// Real, working OTP generation/verification, shared by both seller login
// and shopper login. Delivery is by email (via lib/email.ts's Resend call)
// rather than SMS - this pilot deliberately avoids the SMS/DLT registration
// required in India for transactional SMS, so email is the one channel
// available without that paperwork. The OTP itself is genuinely random per
// phone number (phone stays the account identifier; email is purely the
// delivery address), single-use, time-limited, and attempt-limited - none
// of that changed when delivery moved from the old sendSms() console.log
// stub to sendOtpEmail() below.
import { rateLimit } from "./rate-limit.ts";
import { isEmailDeliveryConfigured, sendOtpEmail } from "./email.ts";

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioOtps: Map<string, OtpRecord> | undefined;
}

const otps = globalThis.__sioOtps ?? (globalThis.__sioOtps = new Map());

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

// A verified-OTP grant, consumed once by /api/v1/shopper/profile right
// after a successful verify - without this, that endpoint had no proof the
// caller actually owns the phone number it was given. It used to accept any
// {name, phone, password} and overwrite an EXISTING shopper's name and set
// a login password for them, since upsertShopper's "existing" branch just
// trusts whatever phone is in the request body - anyone could take over any
// shopper account by phone number alone. Short-lived (just long enough to
// complete the profile step right after verifying) and single-use, same
// reasoning as the OTP code itself.
declare global {
  // eslint-disable-next-line no-var
  var __sioVerifiedPhones: Map<string, number> | undefined;
}
const verifiedPhones = globalThis.__sioVerifiedPhones ?? (globalThis.__sioVerifiedPhones = new Map());
const PHONE_VERIFICATION_TTL_MS = 10 * 60 * 1000;

/** Consumes a recent OTP-verification grant for this phone - true only once per verify. */
export function consumePhoneVerification(phone: string): boolean {
  const key = normalizePhone(phone);
  const expiresAt = verifiedPhones.get(key);
  verifiedPhones.delete(key);
  return !!expiresAt && Date.now() <= expiresAt;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export type RequestOtpResult = { ok: true; devOtp?: string } | { ok: false; error: string };

// `email` is the delivery address for the code (see lib/email.ts) - callers
// are responsible for resolving it (a store/shopper's email on file, or one
// just collected from the login UI) and for requiring it before calling
// this, since there is no other working delivery channel. Everything below
// this point - rate limiting, code generation, TTL, attempts - is unchanged
// from the phone-only/SMS version.
export function requestOtp(phone: string, email: string): RequestOtpResult {
  const key = normalizePhone(phone);
  if (key.length !== 10) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }
  const trimmedEmail = email?.trim() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
    return { ok: false, error: "Enter a valid email address to receive your OTP." };
  }

  const { ok, retryAfterMs } = rateLimit(`otp-request:${key}`, 5, 10 * 60 * 1000);
  if (!ok) {
    return { ok: false, error: `Too many OTP requests. Try again in ${Math.ceil(retryAfterMs / 60000)} minute(s).` };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  // Fire-and-forget: this stays a synchronous, in-memory operation (like
  // the rate limit/attempts/TTL bookkeeping above) rather than making the
  // whole request wait on a network round trip to Resend. A delivery
  // failure here surfaces as "my OTP never arrived" (same failure mode a
  // real SMS gateway has) rather than as an error on this call - the one
  // exception is the configured-vs-not check below, which is a pure env-var
  // read and can be done synchronously.
  void sendOtpEmail(trimmedEmail, code).then((result) => {
    if (!result.delivered && result.reason !== "not_configured") {
      console.error(`[otp] Failed to email OTP to ${trimmedEmail}: ${result.reason}`);
    }
  });

  if (isEmailDeliveryConfigured()) {
    return { ok: true };
  }
  // No RESEND_API_KEY yet - sendOtpEmail() above already logged the code to
  // the console instead of emailing it, so hand it back the same way devOtp
  // always has, until a real key is added (see apps/web/.env.example).
  return { ok: true, devOtp: code };
}

export function verifyOtp(phone: string, code: string): boolean {
  const key = normalizePhone(phone);
  const record = otps.get(key);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otps.delete(key);
    return false;
  }
  record.attempts++;
  if (record.attempts > MAX_VERIFY_ATTEMPTS) {
    otps.delete(key);
    return false;
  }
  if (record.code !== code.trim()) return false;
  otps.delete(key); // single-use - a verified code can't be replayed
  verifiedPhones.set(key, Date.now() + PHONE_VERIFICATION_TTL_MS);
  return true;
}

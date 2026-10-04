// Real, working OTP generation/verification, shared by both seller login
// and shopper login. The only thing not real here is actual SMS delivery -
// that needs a paid gateway (Twilio/MSG91/etc.) this environment has no
// credentials for, matching the existing convention elsewhere in this
// codebase for unintegrated paid third-party services (see createStore's
// payment-gateway comment, or the mocked billing/subscribe flow). The OTP
// itself is genuinely random per phone number, single-use, time-limited,
// and attempt-limited - swap sendSms() for a real provider call and
// everything else here needs no changes.
import { rateLimit } from "./rate-limit.ts";

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

export type RequestOtpResult = { ok: true; devOtp: string } | { ok: false; error: string };

export function requestOtp(phone: string): RequestOtpResult {
  const key = normalizePhone(phone);
  if (key.length !== 10) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  const { ok, retryAfterMs } = rateLimit(`otp-request:${key}`, 5, 10 * 60 * 1000);
  if (!ok) {
    return { ok: false, error: `Too many OTP requests. Try again in ${Math.ceil(retryAfterMs / 60000)} minute(s).` };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  sendSms(key, `Your SORT NOW verification code is ${code}. It expires in 5 minutes. Do not share this code.`);

  // TODO: once a real SMS gateway is wired into sendSms(), stop returning
  // devOtp - it exists only because there is currently no other channel
  // that actually delivers the code to the user in this environment.
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

function sendSms(phone: string, message: string) {
  console.log(`[OTP SMS -> +91${phone}] ${message}`);
}

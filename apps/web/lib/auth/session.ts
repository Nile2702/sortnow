// Minimal signed session tokens (HMAC over base64url JSON) stored in an
// httpOnly cookie - stands in for a real session store (Redis session /
// signed JWT via a proper auth provider) until one exists. Signed so a
// client can't forge a session for a store it doesn't own; httpOnly so
// client-side JS (and therefore XSS) can't read or exfiltrate it, unlike
// the old localStorage-based "session" it replaces.
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-set-SESSION_SECRET-before-deploying";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.error(
    "[auth] SESSION_SECRET is not set. Using an insecure default - every session token is forgeable. Set SESSION_SECRET before deploying."
  );
}

export interface SellerSessionPayload {
  storeId: string;
  storeSlug: string;
  iat: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

export function createSellerSessionToken(payload: Omit<SellerSessionPayload, "iat">): string {
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySellerSessionToken(token: string | undefined | null): SellerSessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SellerSessionPayload;
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - payload.iat > MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SELLER_SESSION_COOKIE = "sio_seller_session";

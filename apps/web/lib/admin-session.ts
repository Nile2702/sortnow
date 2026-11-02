// Signed admin session/2FA tokens, set at /admin/login instead of pasting
// ADMIN_SECRET into every URL (see lib/admin-auth.ts's own comment on why
// there's still only one admin account - this doesn't change that, it just
// replaces the login mechanism). Uses the Web Crypto API (globalThis.crypto,
// available in Node 19+, every browser, and the Edge Runtime) rather than
// Node's "crypto" module/Buffer, which are NOT available in the Edge
// Runtime that middleware.ts runs on - that exact mismatch is what crashed
// every /admin/* page load in production once before (see lib/admin-auth.ts's
// history). Same signed-base64url-JSON shape as lib/auth/session.ts's seller
// session, just reimplemented with APIs that work in both runtimes.
export const ADMIN_SESSION_COOKIE = "sio_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days, same as the seller session

// Second cookie for the gap between "password checked out" and "OTP
// verified" during two-factor login (see app/admin/login/verify/page.tsx) -
// a deliberately different cookie, token purpose, and much shorter lifetime
// than the real session above, so this token is never mistakable for (or
// accepted as) a full admin session even if it ended up presented in the
// wrong place. 10 minutes matches lib/otp.ts's own OTP_TTL_MS - there's no
// point outliving the code it's standing in for.
export const ADMIN_PENDING_2FA_COOKIE = "sio_admin_pending_2fa";
const PENDING_2FA_MAX_AGE_SECONDS = 10 * 60;

function base64url(bytes: ArrayBuffer): string {
  let str = "";
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const str = atob(padded);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(sig);
}

interface TokenPayload {
  purpose: "session" | "pending-2fa";
  iat: number;
}

async function createToken(purpose: TokenPayload["purpose"]): Promise<string | null> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null; // never issue anything if the secret isn't configured

  const body = base64url(new TextEncoder().encode(JSON.stringify({ purpose, iat: Date.now() } satisfies TokenPayload)).buffer);
  const sig = await sign(secret, body);
  return `${body}.${sig}`;
}

async function verifyToken(token: string | undefined | null, purpose: TokenPayload["purpose"], maxAgeMs: number): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !token) return false;

  const [body, sig] = token.split(".");
  if (!body || !sig) return false;

  const expectedSig = await sign(secret, body);
  if (sig.length !== expectedSig.length) return false;
  // Constant-time compare - same reasoning as lib/admin-auth.ts's own key check.
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  if (diff !== 0) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as TokenPayload;
    return payload.purpose === purpose && Date.now() - payload.iat <= maxAgeMs;
  } catch {
    return false;
  }
}

export function createAdminSessionToken(): Promise<string | null> {
  return createToken("session");
}

export function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  return verifyToken(token, "session", ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
}

// Issued right after the password check succeeds, when ADMIN_EMAIL is
// configured (two-factor on) - proof the first factor passed, without yet
// granting real admin access. app/api/v1/admin/login/verify/route.ts
// requires this cookie before it will even look at a submitted OTP.
export function createAdminPendingToken(): Promise<string | null> {
  return createToken("pending-2fa");
}

export function verifyAdminPendingToken(token: string | undefined | null): Promise<boolean> {
  return verifyToken(token, "pending-2fa", PENDING_2FA_MAX_AGE_SECONDS * 1000);
}

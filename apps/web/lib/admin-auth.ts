import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "./rate-limit";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from "./admin-session";

// Node's crypto.timingSafeEqual (and Buffer) aren't available in the Edge
// Runtime that Next.js Middleware runs on - importing "crypto" there throws
// at request time, which crashed every single /admin/* page load in
// production with a generic MIDDLEWARE_INVOCATION_FAILED instead of a
// proper "wrong key" response. This does the same constant-time comparison
// (XOR every byte, OR the results together, only compare the final
// accumulator) using nothing but plain string ops, so it works identically
// on Edge, Node, and in the browser.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Minimal shared-secret gate for the pilot's one-person admin tool
// (app/admin/** + app/api/v1/admin/**). There's still no admin role/account
// system (only seller sessions, see lib/auth/session.ts) - one person
// reviewing a handful of hand-picked sellers doesn't need one. What changed
// is *how* that one secret gets presented: instead of pasting
// ?key=<ADMIN_SECRET> into every URL (fragile - ends up in browser history,
// server logs, anywhere the link gets pasted, and broke outright the one
// time a dependency it relied on didn't work on Edge), the site owner now
// logs in once at /admin/login (see app/api/v1/admin/login/route.ts) and
// gets a signed session cookie (lib/admin-session.ts) instead. isValidAdminKey
// below still exists for that login check itself, and as a fallback so an
// old bookmarked ?key= link still works instead of just breaking.
//
// `ip` rate-limits attempts per caller: a single shared secret with no
// attempt throttling is otherwise brute-forceable with no slowdown.
// Per-IP (not global) so a flood of wrong guesses from one attacker can't
// lock the real site owner out too. rateLimit() here counts every call,
// correct key included (it can't distinguish "was this guess right" on its
// own) - 90/10min is set generously above any realistic human admin session
// (loading a handful of pages, clicking approve/reject/hold a few times)
// specifically so the real site owner is never the one who trips it, while
// still capping a brute-force script to a trickle against a secret this
// long.
export function isValidAdminKey(key: string | null | undefined, ip: string): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false; // never authorize anything if the secret isn't configured

  const limit = rateLimit(`admin-key:${ip}`, 90, 10 * 60_000);
  if (!limit.ok) return false;

  // Constant-time comparison - a plain `===` short-circuits on the first
  // mismatched byte, which leaks (admittedly faint, over a real network)
  // timing information about how many leading characters of a guess are
  // correct. Same reasoning and pattern as lib/auth/session.ts's signature
  // check.
  return timingSafeEqualStr(key ?? "", expected);
}

// The one check every /admin/* page load (middleware.ts) and every
// /api/v1/admin/** route handler should use from here on - a valid session
// cookie first, falling back to the legacy ?key= for old bookmarked links.
// Both NextRequest (middleware, route handlers) expose the same
// .cookies/.nextUrl shape this needs.
export async function isAuthorizedAdminRequest(req: NextRequest): Promise<boolean> {
  const sessionToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifyAdminSessionToken(sessionToken)) return true;
  return isValidAdminKey(req.nextUrl.searchParams.get("key"), clientIp(req));
}

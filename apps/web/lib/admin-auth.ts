import { rateLimit } from "./rate-limit";

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
// (app/admin/sellers + app/api/v1/admin/**). There's no admin role/session
// system anywhere in this codebase (only seller sessions, see
// lib/auth/session.ts) - building a real one just for the site owner to
// review a handful of hand-picked sellers would be overkill. Instead,
// every admin page load and API call must carry `?key=<ADMIN_SECRET>` in
// the URL (set the ADMIN_SECRET env var - see .env.example). Checked both
// in middleware.ts (gates /admin/* page loads) and directly inside each
// /api/v1/admin/** route handler (middleware's matcher excludes all of
// /api/* for the unrelated tenant-domain rewriting it does, so those
// routes can't rely on it and must check for themselves).
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

import { rateLimit } from "./rate-limit";

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

  return key === expected;
}

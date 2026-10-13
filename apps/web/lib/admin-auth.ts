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
export function isValidAdminKey(key: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false; // never authorize anything if the secret isn't configured
  return key === expected;
}

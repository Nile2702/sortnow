// Resolves the real, currently-deployed base URL instead of a hardcoded
// domain - app/sitemap.ts, app/robots.ts, and app/layout.tsx's metadataBase
// all used to hardcode "https://sortitout.in" even though this pilot is
// actually live at https://sortnow.vercel.app, so every OG/share preview,
// the canonical URL, and the submitted sitemap/robots.txt pointed at a
// domain nothing resolves to. Vercel sets VERCEL_PROJECT_PRODUCTION_URL (the
// project's production domain) and VERCEL_URL (the current deployment's own
// URL) automatically - using those means this keeps working correctly with
// zero further changes once a real custom domain is attached later, instead
// of needing another hardcoded-domain fix at that point too.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

import { NextRequest, NextResponse } from "next/server";
import { isValidAdminKey } from "./lib/admin-auth";
import { clientIp } from "./lib/rate-limit";
import { verifyAdminSessionToken, createAdminSessionToken, ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from "./lib/admin-session";

/**
 * Resolves all three storefront access patterns to one internal route:
 *   1. sortnow.in/store/urban-vogue            -> passthrough
 *   2. urban-vogue.sortnow.in                  -> rewrite to /store/urban-vogue
 *   3. www.urbanvogue.com (custom domain)      -> rewrite to /store/[resolved-slug]
 *
 * Custom-domain -> slug resolution is cached at the edge (KV) since it can't
 * be derived from the hostname alone.
 */

const PLATFORM_ROOT_DOMAIN = "sortnow.in";

// Matches a private LAN IP (10.x, 192.168.x, 172.16-31.x), with or without a
// port - lets a phone on the same Wi-Fi hit this machine's LAN address
// (e.g. http://192.168.1.23:3000) and be treated as the platform root
// instead of falling through to "domain not configured".
const LAN_IP_HOST = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)[\d.]+(:\d+)?$/;

// Public dev-tunnel hostnames (localtunnel, ngrok, Cloudflare quick tunnels,
// localhost.run's SSH-based tunnel) - the standard workaround when a
// firewall or network policy blocks direct LAN access to this machine.
const DEV_TUNNEL_HOST = /\.(loca\.lt|ngrok-free\.app|ngrok\.io|ngrok\.app|trycloudflare\.com|lhr\.life)$/;

// Vercel's own preview/production URLs (*.vercel.app) - always treated as
// the platform root, the same way localhost is. Unlike DEV_TUNNEL_HOST this
// isn't gated behind ALLOW_LOCAL_TUNNEL_HOST: a real deploy on Vercel has no
// other way to reach the site before a custom domain is attached, so this
// must work unconditionally in production, not just as an opt-in local/dev
// preview convenience.
const VERCEL_HOST = /\.vercel\.app$/;

// Explicit opt-in rather than an `process.env.NODE_ENV !== "production"`
// check: `next start` (used to test a real production build, e.g. for
// performance) forces NODE_ENV to "production" regardless of intent, so
// gating on NODE_ENV would make this silently stop working the moment
// someone builds for production - and a real prod deploy must NEVER honor a
// bare IP or tunnel host as the platform root, so this has to default off
// and be turned on deliberately: `ALLOW_LOCAL_TUNNEL_HOST=1 npm start` for a
// production-build mobile/tunnel preview.
const ALLOW_LOCAL_TUNNEL_HOST = process.env.ALLOW_LOCAL_TUNNEL_HOST === "1";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Pilot admin review tool (app/admin/**) - shared-secret gate, see
  // lib/admin-auth.ts and lib/admin-session.ts. Checked here (not just in
  // the page itself) so an unauthenticated visitor gets redirected to
  // /admin/login rather than whatever a Server Component can manage to
  // render with a 200 status.
  if (url.pathname.startsWith("/admin")) {
    // The login page itself (and its second-factor step) must always be
    // reachable, or there'd be no way to ever get a session cookie in the
    // first place - /admin/login/verify only ever checks its own short-lived
    // pending-2FA cookie (see app/admin/login/verify/page.tsx), not this
    // full-session gate.
    if (url.pathname === "/admin/login" || url.pathname === "/admin/login/verify") return NextResponse.next();

    if (await verifyAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
      return NextResponse.next();
    }

    // Legacy fallback: an old bookmarked ?key=<ADMIN_SECRET> link still
    // works instead of just breaking - and upgrades itself to a real
    // session right away, so the key only has to be pasted once more, ever.
    if (isValidAdminKey(url.searchParams.get("key"), clientIp(req))) {
      const res = NextResponse.next();
      const token = await createAdminSessionToken();
      if (token) {
        res.cookies.set(ADMIN_SESSION_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
        });
      }
      return res;
    }

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = `?next=${encodeURIComponent(url.pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  const host = req.headers.get("host") ?? "";

  // 1. Root platform domain (consumer app, path-based stores) - no rewrite needed.
  //    localhost (and, in dev, a LAN IP) is treated as the root domain for
  //    local development.
  if (
    host === PLATFORM_ROOT_DOMAIN ||
    host === `www.${PLATFORM_ROOT_DOMAIN}` ||
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    VERCEL_HOST.test(host) ||
    (ALLOW_LOCAL_TUNNEL_HOST && (LAN_IP_HOST.test(host) || DEV_TUNNEL_HOST.test(host)))
  ) {
    return NextResponse.next();
  }

  // 2. Tenant subdomain, e.g. urban-vogue.sortnow.in
  if (host.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${PLATFORM_ROOT_DOMAIN}`, "");
    url.pathname = `/store/${slug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 3. Fully custom domain - resolve via edge-cached domain map.
  const slug = await resolveCustomDomainToSlug(host);
  if (slug) {
    url.pathname = `/store/${slug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Unknown/unverified domain - fall through to a "domain not connected" page.
  url.pathname = "/domain-not-configured";
  return NextResponse.rewrite(url);
}

async function resolveCustomDomainToSlug(host: string): Promise<string | null> {
  // Backed by an edge KV (e.g. Vercel Edge Config / Cloudflare KV) populated
  // whenever a merchant verifies a custom domain (see Tenant Service). Not
  // configured in every environment (e.g. EDGE_CONFIG_URL is unset in a
  // deploy that hasn't wired up custom domains yet) - a bad/missing URL or a
  // network hiccup here must never 500 the entire site, just fall through to
  // "domain not configured" like a genuine lookup miss would.
  try {
    const res = await fetch(`${process.env.EDGE_CONFIG_URL}/domain-map/${host}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.slug ?? null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

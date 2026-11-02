import { NextRequest, NextResponse } from "next/server";
import { isValidAdminKey } from "../../../../../lib/admin-auth";
import { clientIp } from "../../../../../lib/rate-limit";
import { requestEmailOtp } from "../../../../../lib/otp";
import {
  createAdminSessionToken,
  createAdminPendingToken,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ADMIN_PENDING_2FA_COOKIE,
} from "../../../../../lib/admin-session";

async function issueFullSession(destination: URL): Promise<NextResponse> {
  const res = NextResponse.redirect(destination, 303);
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

// The password field is submitted in the POST body (standard form encoding),
// never as a query param - unlike every other /admin/** action, this one
// carries the actual secret, and a query param ends up in browser history
// and server access logs. See app/admin/login/page.tsx for the plain
// <form> this answers (no client JS, same convention as the rest of admin).
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/admin/sellers");
  // Only ever redirect somewhere inside /admin - a "next" value from a form
  // field is attacker-controllable the same way an open-redirect query
  // param would be.
  const safeNext = next.startsWith("/admin") ? next : "/admin/sellers";

  if (!isValidAdminKey(password, clientIp(req))) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?error=1&next=${encodeURIComponent(safeNext)}`;
    return NextResponse.redirect(url, 303);
  }

  // Two-factor is opt-in: set ADMIN_EMAIL to turn it on. Without it, the
  // password alone still grants a session - same single-factor behavior
  // this login replaced the ?key= scheme with, so a pilot that hasn't set
  // up email yet isn't locked out of its own admin tool.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const otpResult = requestEmailOtp(adminEmail);
    if (!otpResult.ok) {
      // ADMIN_EMAIL is set but isn't actually a valid address (a typo in
      // the env var, most likely) - requestEmailOtp never generated a code,
      // so sending the admin to the verify step would be a dead end they
      // could never pass. Fail open to a single-factor session rather than
      // lock the site owner out of their own tool over their own
      // misconfiguration; this is logged loudly so it gets noticed and fixed.
      console.error(`[admin-login] ADMIN_EMAIL is set but invalid (${otpResult.error}) - falling back to password-only login.`);
      const url = req.nextUrl.clone();
      url.pathname = safeNext;
      url.search = "";
      return issueFullSession(url);
    }

    const url = req.nextUrl.clone();
    url.pathname = "/admin/login/verify";
    // devOtp only ever comes back when RESEND_API_KEY isn't configured yet
    // (see lib/otp.ts) - a local/dev-only fallback, never present once real
    // email delivery is set up, same as every other OTP flow in this app.
    url.search = `?next=${encodeURIComponent(safeNext)}${otpResult.devOtp ? `&dev_otp=${otpResult.devOtp}` : ""}`;
    const res = NextResponse.redirect(url, 303);
    const pendingToken = await createAdminPendingToken();
    if (pendingToken) {
      // path: "/" (not scoped to /admin/login) - the verify API route lives
      // under /api/v1/admin/login/verify, a completely different path tree
      // from the page at /admin/login/verify, so there's no shorter prefix
      // that reaches both. The short 10-minute expiry (see
      // lib/admin-session.ts) is what actually limits this token's exposure.
      res.cookies.set(ADMIN_PENDING_2FA_COOKIE, pendingToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    }
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = safeNext;
  url.search = "";
  return issueFullSession(url);
}

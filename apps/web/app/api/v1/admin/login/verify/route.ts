import { NextRequest, NextResponse } from "next/server";
import { verifyEmailOtp } from "../../../../../../lib/otp";
import {
  verifyAdminPendingToken,
  createAdminSessionToken,
  ADMIN_PENDING_2FA_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "../../../../../../lib/admin-session";

// Second half of two-factor admin login - see app/api/v1/admin/login/route.ts
// for the first (password) half and app/admin/login/verify/page.tsx for the
// form this answers. Requires the pending-2FA cookie that route issues: a
// correct OTP alone is never enough on its own, since requesting one in the
// first place already proved the password.
export async function POST(req: NextRequest) {
  const pendingToken = req.cookies.get(ADMIN_PENDING_2FA_COOKIE)?.value;
  const form = await req.formData();
  const next = String(form.get("next") ?? "/admin/sellers");
  const safeNext = next.startsWith("/admin") ? next : "/admin/sellers";

  if (!(await verifyAdminPendingToken(pendingToken))) {
    // Expired or missing - back to the start, not just this step, since
    // there's no password check left to lean on.
    return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(safeNext)}`, req.url), 303);
  }

  const otp = String(form.get("otp") ?? "");
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  if (!adminEmail || !verifyEmailOtp(adminEmail, otp)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login/verify";
    url.search = `?error=1&next=${encodeURIComponent(safeNext)}`;
    return NextResponse.redirect(url, 303);
  }

  const url = req.nextUrl.clone();
  url.pathname = safeNext;
  url.search = "";
  const res = NextResponse.redirect(url, 303);
  res.cookies.delete(ADMIN_PENDING_2FA_COOKIE);
  const sessionToken = await createAdminSessionToken();
  if (sessionToken) {
    res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
  }
  return res;
}

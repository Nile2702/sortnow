import { NextRequest, NextResponse } from "next/server";
import { isValidAdminKey } from "../../../../../lib/admin-auth";
import { clientIp } from "../../../../../lib/rate-limit";
import { createAdminSessionToken, ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from "../../../../../lib/admin-session";

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

  const token = await createAdminSessionToken();
  const url = req.nextUrl.clone();
  url.pathname = safeNext;
  url.search = "";
  const res = NextResponse.redirect(url, 303);
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

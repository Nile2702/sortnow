import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySellerLogin } from "../../../../../../lib/seed-data";
import { createSellerSessionToken, SELLER_SESSION_COOKIE } from "../../../../../../lib/auth/session";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";

export async function POST(req: NextRequest) {
  const { storeSlug, password } = await req.json();
  if (typeof storeSlug !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // 10 attempts per 5 minutes per IP+store, to slow down password guessing.
  const { ok, retryAfterMs } = rateLimit(`login:${clientIp(req)}:${storeSlug}`, 10, 5 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const store = verifySellerLogin(storeSlug, password);
  if (!store) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = createSellerSessionToken({ storeId: store.id, storeSlug: store.slug });
  cookies().set(SELLER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ id: store.id, slug: store.slug, name: store.name });
}

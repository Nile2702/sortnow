import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findStoreByPhone } from "../../../../../../../lib/seed-data";
import { verifyOtp } from "../../../../../../../lib/otp";
import { createSellerSessionToken, SELLER_SESSION_COOKIE } from "../../../../../../../lib/auth/session";
import { rateLimit, clientIp } from "../../../../../../../lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid_request", message: "phone and code are required." }, { status: 400 });
  }

  const { ok, retryAfterMs } = rateLimit(`seller-otp-verify:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const store = findStoreByPhone(body.phone);
  if (!store || !verifyOtp(body.phone, body.code)) {
    return NextResponse.json({ error: "invalid_otp", message: "Incorrect or expired OTP." }, { status: 401 });
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

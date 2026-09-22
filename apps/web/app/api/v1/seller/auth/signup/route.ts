import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createStore } from "../../../../../../lib/seed-data";
import { createSellerSessionToken, SELLER_SESSION_COOKIE } from "../../../../../../lib/auth/session";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";
import { moderateText } from "../../../../../../lib/content-moderation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { name, category, pincode, localMarket, password } = body;
  if (
    typeof name !== "string" ||
    typeof category !== "string" ||
    typeof pincode !== "string" ||
    typeof localMarket !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // A handful of signups per IP per hour - generous for a real merchant,
  // tight enough to blunt scripted account creation.
  const { ok, retryAfterMs } = rateLimit(`signup:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many attempts. Try again in a while." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const moderation = moderateText([name, localMarket]);
  if (moderation.blocked) {
    return NextResponse.json(
      { error: "invalid_input", message: `Store name or area can't reference ${moderation.category}.` },
      { status: 400 }
    );
  }

  const result = createStore({ name, category, pincode, localMarket, password });
  if ("error" in result) {
    return NextResponse.json({ error: "invalid_input", message: result.error }, { status: 400 });
  }

  const { store } = result;
  const token = createSellerSessionToken({ storeId: store.id, storeSlug: store.slug });
  cookies().set(SELLER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ id: store.id, slug: store.slug, name: store.name }, { status: 201 });
}

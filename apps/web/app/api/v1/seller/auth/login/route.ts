import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySellerLogin } from "../../../../../../lib/seed-data";
import { createSellerSessionToken, SELLER_SESSION_COOKIE } from "../../../../../../lib/auth/session";

export async function POST(req: NextRequest) {
  const { storeSlug, password } = await req.json();
  if (typeof storeSlug !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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

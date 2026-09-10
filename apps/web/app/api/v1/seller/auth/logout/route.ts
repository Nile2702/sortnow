import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SELLER_SESSION_COOKIE } from "../../../../../../lib/auth/session";

export async function POST() {
  cookies().delete(SELLER_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

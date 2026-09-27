import { NextRequest, NextResponse } from "next/server";
import { joinWaitlist, getProductWaitlistCount } from "../../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  return NextResponse.json({ count: getProductWaitlistCount(params.productId) });
}

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const { ok } = rateLimit(`waitlist:${clientIp(req)}`, 10, 60_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.shopperName !== "string" || !body.shopperName.trim()) {
    return NextResponse.json({ error: "invalid_input", message: "Your name is required." }, { status: 400 });
  }
  if (typeof body.shopperPhone !== "string" || !/^\d{10}$/.test(body.shopperPhone)) {
    return NextResponse.json({ error: "invalid_input", message: "A valid 10-digit phone is required." }, { status: 400 });
  }

  const result = joinWaitlist(params.productId, body.shopperName, body.shopperPhone);
  if (!result.ok) return NextResponse.json({ error: "invalid_input", message: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

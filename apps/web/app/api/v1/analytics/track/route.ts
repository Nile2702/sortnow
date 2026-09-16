import { NextRequest, NextResponse } from "next/server";
import { trackPageView, stores } from "../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

// Public and unauthenticated by necessity (fires on every storefront page
// view), which also makes it the cheapest endpoint on the site to spam -
// analyticsEvents has no cap, and every call triggers a full rewrite of the
// persisted db.json. Rate limit by IP so that's a nuisance, not a way to
// grow the event log or hammer disk I/O without bound.
export async function POST(req: NextRequest) {
  const { ok } = rateLimit(`analytics:${clientIp(req)}`, 60, 60_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { storeSlug, qrPosition } = await req.json();
  if (typeof storeSlug !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (qrPosition !== undefined && (typeof qrPosition !== "string" || qrPosition.length > 60)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const store = stores.find((s) => s.slug === storeSlug);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  trackPageView(store.id, qrPosition);
  return NextResponse.json({ ok: true });
}

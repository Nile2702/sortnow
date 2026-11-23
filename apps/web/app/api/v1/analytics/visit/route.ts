import { NextRequest, NextResponse } from "next/server";
import { trackSiteVisit } from "../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

// Public and unauthenticated by necessity (fires on every page view across
// the whole site, from VisitorTracking.tsx in the root layout), which also
// makes it the cheapest endpoint on the site to spam - every call is a real
// database write. Rate limit by IP so that's a nuisance, not a way to grow
// the event log without bound (trackSiteVisit also prunes rows past its own
// retention window - see SITE_VISIT_RETENTION_DAYS in lib/seed-data.ts).
// A higher limit than /analytics/track since this fires on every route
// change site-wide, not just once per storefront page load.
export async function POST(req: NextRequest) {
  const { ok } = rateLimit(`visit:${clientIp(req)}`, 180, 60_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { visitorId, path, referrer, locationLabel } = body ?? {};
  if (typeof visitorId !== "string" || visitorId.length === 0 || visitorId.length > 100) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (typeof path !== "string" || path.length === 0 || path.length > 300) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (referrer !== undefined && (typeof referrer !== "string" || referrer.length > 300)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (locationLabel !== undefined && (typeof locationLabel !== "string" || locationLabel.length > 100)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  await trackSiteVisit(visitorId, path, referrer, locationLabel);
  return NextResponse.json({ ok: true });
}

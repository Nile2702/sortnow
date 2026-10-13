import { NextRequest, NextResponse } from "next/server";
import { trackPageView, getAllStores } from "../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

// Public and unauthenticated by necessity (fires on every storefront page
// view), which also makes it the cheapest endpoint on the site to spam -
// every call is a real database write. Rate limit by IP so that's a
// nuisance, not a way to grow the event log or hammer the database without
// bound (trackPageView also hard-caps the table itself - see
// MAX_ANALYTICS_EVENTS in lib/seed-data.ts).
export async function POST(req: NextRequest) {
  const { ok } = rateLimit(`analytics:${clientIp(req)}`, 60, 60_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { storeSlug, qrPosition } = body ?? {};
  if (typeof storeSlug !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (qrPosition !== undefined && (typeof qrPosition !== "string" || qrPosition.length > 60)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const stores = await getAllStores();
  const store = stores.find((s) => s.slug === storeSlug);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await trackPageView(store.id, qrPosition);
  return NextResponse.json({ ok: true });
}

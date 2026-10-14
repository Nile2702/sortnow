import { NextRequest, NextResponse } from "next/server";
import { getAllStores } from "../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

// Powers the seller LOGIN page's "pick your store" dropdown - called before
// any session exists, so it can't be scoped to "the logged-in merchant's own
// stores" (there isn't one yet). Only id/slug/name - no more sensitive than
// what's already public via /shops. This dropdown pattern doesn't scale past
// a handful of pilot sellers though (a real multi-tenant login wouldn't show
// a public list of every other seller's shop name) - replacing it with the
// seller just entering their own store slug/phone directly is a login-UX
// change worth making before onboarding many more real sellers, not done
// here. Rate-limited per caller IP since it's unauthenticated. No
// params/cookies read here, so Next.js would otherwise cache one frozen
// response at build time - a freshly signed-up store would never appear in
// the login dropdown without a full rebuild.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = rateLimit(`seller-stores:${clientIp(req)}`, 30, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const stores = await getAllStores();
  return NextResponse.json(stores.map((s) => ({ id: s.id, slug: s.slug, name: s.name })));
}

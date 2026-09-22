import { NextResponse } from "next/server";
import { stores } from "../../../../../lib/seed-data";

// All stores, unfiltered by geography - used by the Seller Portal's store
// switcher (a real deployment would scope this to the logged-in merchant's
// own stores instead of listing everyone's). No params/cookies read here,
// so Next.js would otherwise cache one frozen response at build time - a
// freshly signed-up store would never appear in the login dropdown without
// a full rebuild.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(stores.map((s) => ({ id: s.id, slug: s.slug, name: s.name })));
}

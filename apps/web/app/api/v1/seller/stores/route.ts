import { NextResponse } from "next/server";
import { stores } from "../../../../../lib/seed-data";

// All stores, unfiltered by geography - used by the Seller Portal's store
// switcher (a real deployment would scope this to the logged-in merchant's
// own stores instead of listing everyone's).
export async function GET() {
  return NextResponse.json(stores.map((s) => ({ id: s.id, slug: s.slug, name: s.name })));
}

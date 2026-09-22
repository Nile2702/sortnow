import { NextResponse } from "next/server";
import { getAllShops } from "../../../../lib/seed-data";

// Full store directory - powers the standalone /shops page. This handler
// takes no params and reads no cookies/headers, so Next.js would otherwise
// treat it as fully static and cache one frozen response at build time -
// meaning a brand-new store finishing signup (or any store's status
// changing at all) would never actually appear here without a full
// rebuild. Force it dynamic so every request re-reads the current data.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAllShops());
}

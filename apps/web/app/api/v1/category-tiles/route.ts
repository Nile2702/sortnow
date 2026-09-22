import { NextResponse } from "next/server";
import { getCategoryTileCounts } from "../../../../lib/seed-data";

// No params/cookies read here, so Next.js would otherwise cache one frozen
// response at build time - meaning a newly published or newly active
// store's products would never move these counts without a full rebuild.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getCategoryTileCounts());
}

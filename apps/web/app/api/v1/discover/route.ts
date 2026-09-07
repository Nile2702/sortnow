import { NextRequest, NextResponse } from "next/server";
import { discoverStores } from "../../../../lib/seed-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") ?? undefined;
  const radiusKm = searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined;
  const category = searchParams.get("category") ?? undefined;
  const liveOnly = searchParams.get("liveOnly") === "true";

  const results = discoverStores({ pincode, radiusKm, category, liveOnly });
  return NextResponse.json(results);
}

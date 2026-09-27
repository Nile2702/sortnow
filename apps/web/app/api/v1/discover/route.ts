import { NextRequest, NextResponse } from "next/server";
import { discoverStores } from "../../../../lib/seed-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") ?? undefined;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  const radiusKm = searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined;
  const gender = searchParams.get("gender") ?? undefined;
  const subCategory = searchParams.get("subCategory") ?? undefined;

  const results = discoverStores({ pincode, lat, lng, radiusKm, gender, subCategory });
  return NextResponse.json(results);
}

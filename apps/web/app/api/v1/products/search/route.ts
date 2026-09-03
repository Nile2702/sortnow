import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "../../../../../lib/seed-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") ?? undefined;
  const radiusKm = searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined;
  const category = searchParams.get("category") ?? undefined;
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const size = searchParams.get("size") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;

  const results = searchProducts({ pincode, radiusKm, category, minPrice, maxPrice, size, sort });
  return NextResponse.json(results);
}

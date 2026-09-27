import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "../../../../../lib/seed-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") ?? undefined;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  const radiusKm = searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined;
  const gender = searchParams.get("gender") ?? undefined;
  const subCategory = searchParams.get("subCategory") ?? undefined;
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const size = searchParams.get("size") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const results = searchProducts({ pincode, lat, lng, radiusKm, gender, subCategory, minPrice, maxPrice, size, sort, q });
  return NextResponse.json(results);
}

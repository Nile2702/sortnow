import { NextRequest, NextResponse } from "next/server";
import { getProductFacets } from "../../../../../lib/seed-data";

// Backs the category page's left filter sidebar - one call returns counts
// for every facet group (category, store, color, discount tier) plus the
// achievable price range for the current gender/search/location context,
// each computed with every OTHER active facet selection still applied (see
// getProductFacets in lib/seed-data.ts for why).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") ?? undefined;
  const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined;
  const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined;
  const radiusKm = searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined;
  const gender = searchParams.get("gender") ?? undefined;
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const size = searchParams.get("size") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const subCategories = searchParams.get("subCategories")?.split(",").filter(Boolean);
  const storeIds = searchParams.get("storeIds")?.split(",").filter(Boolean);
  const colors = searchParams.get("colors")?.split(",").filter(Boolean);
  const minDiscount = searchParams.get("minDiscount") ? Number(searchParams.get("minDiscount")) : undefined;

  const facets = await getProductFacets({
    pincode,
    lat,
    lng,
    radiusKm,
    gender,
    minPrice,
    maxPrice,
    size,
    q,
    subCategories,
    storeIds,
    colors,
    minDiscount,
  });
  return NextResponse.json(facets);
}

import { NextRequest, NextResponse } from "next/server";
import { getSimilarProducts, applyActiveSales } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const results = await getSimilarProducts(params.productId, 4);
  return NextResponse.json(await applyActiveSales(results));
}

import { NextRequest, NextResponse } from "next/server";
import { getComplementaryProducts, applyActiveSales } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const results = await getComplementaryProducts(params.productId, 4);
  return NextResponse.json(await applyActiveSales(results));
}

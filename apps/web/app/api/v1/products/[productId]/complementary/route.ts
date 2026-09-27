import { NextRequest, NextResponse } from "next/server";
import { getComplementaryProducts } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  return NextResponse.json(getComplementaryProducts(params.productId, 4));
}

import { NextRequest, NextResponse } from "next/server";
import { getSimilarProducts } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  return NextResponse.json(getSimilarProducts(params.productId, 4));
}

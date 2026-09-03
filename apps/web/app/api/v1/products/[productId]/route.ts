import { NextRequest, NextResponse } from "next/server";
import { products, stores } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const product = products.find((p) => p.id === params.productId);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const store = stores.find((s) => s.id === product.storeId);
  return NextResponse.json({ ...product, store });
}

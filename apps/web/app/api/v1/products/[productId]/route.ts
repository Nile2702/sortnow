import { NextRequest, NextResponse } from "next/server";
import { products, stores, getColorSiblings } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const product = products.find((p) => p.id === params.productId);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const store = stores.find((s) => s.id === product.storeId);
  const colorVariants = getColorSiblings(product)
    .map((p) => ({ id: p.id, color: p.color, thumbnail: p.images[0]?.url }))
    .filter((v) => v.color);

  // costPrice is the seller's own purchase cost, never meant to leave the
  // seller dashboard (see Product.costPrice) - this is a shopper-facing
  // route, so it's stripped before responding rather than spread straight
  // through.
  const { costPrice: _costPrice, ...publicProduct } = product;
  return NextResponse.json({ ...publicProduct, store, colorVariants });
}

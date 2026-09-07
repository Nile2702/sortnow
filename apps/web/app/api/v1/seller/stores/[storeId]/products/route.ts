import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getStoreProducts, createProduct, stores } from "../../../../../../../lib/seed-data";

// Seller-facing catalog endpoint: unlike the public /v1/stores/[id]/products
// route (capped, filtered for shoppers), this returns the full unfiltered
// catalog for the merchant managing it, and accepts writes.
export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json([], { status: 404 });
  return NextResponse.json(getStoreProducts(store.id));
}

export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const product = createProduct(store.id, body);

  revalidateTag(`products:${store.id}`);
  revalidatePath(`/store/${store.slug}`);

  return NextResponse.json(product, { status: 201 });
}

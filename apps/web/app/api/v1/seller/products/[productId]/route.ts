import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { updateProduct, deleteProduct, products, stores } from "../../../../../../lib/seed-data";

export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  const body = await req.json();
  const updated = updateProduct(params.productId, body);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(`products:${updated.storeId}`);
  const store = stores.find((s) => s.id === updated.storeId);
  if (store) revalidatePath(`/store/${store.slug}`);

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { productId: string } }) {
  const existing = products.find((p) => p.id === params.productId);
  const ok = deleteProduct(params.productId);
  if (!ok || !existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(`products:${existing.storeId}`);
  const store = stores.find((s) => s.id === existing.storeId);
  if (store) revalidatePath(`/store/${store.slug}`);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { updateProduct, deleteProduct, products, stores } from "../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../lib/auth/require-seller";
import { validateProductInput } from "../../../../../../lib/validate-product";

export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  const existing = products.find((p) => p.id === params.productId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const existingStore = stores.find((s) => s.id === existing.storeId);
  const denied = requireSellerForStore(existing.storeId, existingStore?.slug);
  if (denied) return denied;

  const body = await req.json();
  const { errors, data } = validateProductInput(body, false);
  if (errors.length > 0) {
    return NextResponse.json({ error: "invalid_input", errors }, { status: 400 });
  }

  const updated = updateProduct(params.productId, data);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(`products:${updated.storeId}`);
  const store = stores.find((s) => s.id === updated.storeId);
  if (store) revalidatePath(`/store/${store.slug}`);

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { productId: string } }) {
  const existing = products.find((p) => p.id === params.productId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const existingStore = stores.find((s) => s.id === existing.storeId);
  const denied = requireSellerForStore(existing.storeId, existingStore?.slug);
  if (denied) return denied;

  const ok = deleteProduct(params.productId);
  if (!ok || !existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(`products:${existing.storeId}`);
  const store = stores.find((s) => s.id === existing.storeId);
  if (store) revalidatePath(`/store/${store.slug}`);

  return NextResponse.json({ ok: true });
}

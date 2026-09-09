import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { stores, setStoreLiveSale, clearStoreLiveSale } from "../../../../../../lib/seed-data";

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const liveSale = setStoreLiveSale(store.id, body);

  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/shops");
  revalidatePath("/");

  return NextResponse.json(liveSale);
}

export async function DELETE(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  clearStoreLiveSale(store.id);

  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/shops");
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { themes, stores, updateStoreTheme } from "../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../lib/auth/require-seller";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const theme = themes[store.id];
  if (!theme) return NextResponse.json({ error: "no_theme" }, { status: 404 });
  return NextResponse.json(theme);
}

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json();
  const updated = updateStoreTheme(store.id, body);
  if (!updated) return NextResponse.json({ error: "no_theme" }, { status: 404 });

  // Bust both the theme fetch cache and the storefront page's ISR cache so
  // Theme Studio changes go live immediately instead of waiting out the
  // normal 600s/60s revalidation windows.
  revalidateTag(`theme:${store.id}`);
  revalidatePath(`/store/${store.slug}`);

  return NextResponse.json(updated);
}

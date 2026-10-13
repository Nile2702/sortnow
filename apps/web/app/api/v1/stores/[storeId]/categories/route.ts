import { NextRequest, NextResponse } from "next/server";
import { getAllCategories, getAllStores } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json([], { status: 404 });
  const categories = await getAllCategories();
  return NextResponse.json(categories[store.id] ?? []);
}

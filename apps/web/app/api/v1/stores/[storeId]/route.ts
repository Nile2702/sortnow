import { NextRequest, NextResponse } from "next/server";
import { getAllStores } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  // `storeId` also accepts a slug here, since public routes key by slug while
  // internal service-to-service calls (theme/product routes) key by id.
  const stores = await getAllStores();
  const store = stores.find((s) => s.slug === params.storeId || s.id === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(store);
}

import { NextRequest, NextResponse } from "next/server";
import { getStoreAnalytics, stores } from "../../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(getStoreAnalytics(store.id));
}

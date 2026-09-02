import { NextRequest, NextResponse } from "next/server";
import { liveSales, stores } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json(null, { status: 404 });

  const sale = liveSales[store.id];
  if (!sale) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(sale);
}

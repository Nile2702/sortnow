import { NextRequest, NextResponse } from "next/server";
import { themes, stores } from "../../../../../../lib/seed-data";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const theme = themes[store.id];
  if (!theme) return NextResponse.json({ error: "no_theme" }, { status: 404 });
  return NextResponse.json(theme);
}

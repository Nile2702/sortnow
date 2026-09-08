import { NextRequest, NextResponse } from "next/server";
import { trackPageView, stores } from "../../../../../lib/seed-data";

export async function POST(req: NextRequest) {
  const { storeSlug, qrPosition } = await req.json();
  const store = stores.find((s) => s.slug === storeSlug);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  trackPageView(store.id, qrPosition);
  return NextResponse.json({ ok: true });
}

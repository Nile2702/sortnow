import { NextResponse } from "next/server";
import { stores } from "../../../../../../lib/seed-data";
import { getSellerSession } from "../../../../../../lib/auth/require-seller";

export async function GET() {
  const session = getSellerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const store = stores.find((s) => s.id === session.storeId);
  if (!store) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({ id: store.id, slug: store.slug, name: store.name });
}

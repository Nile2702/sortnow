import { NextRequest, NextResponse } from "next/server";
import { stores, boostStore, BOOST_PACKAGES } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  return NextResponse.json({ boostedUntil: store.boostedUntil ?? null, packages: BOOST_PACKAGES });
}

export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const { days } = await req.json().catch(() => ({}));
  const pkg = BOOST_PACKAGES.find((p) => p.days === days);
  if (!pkg) return NextResponse.json({ error: "invalid_input", message: "Unknown boost package." }, { status: 400 });

  const updated = boostStore(store.id, pkg.days);
  return NextResponse.json({ boostedUntil: updated?.boostedUntil ?? null });
}

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { stores, setStoreLiveSale, clearStoreLiveSale } from "../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../lib/auth/require-seller";

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json();
  const { headline, discountLabel, durationHours } = body ?? {};

  if (typeof headline !== "string" || !headline.trim() || headline.length > 120) {
    return NextResponse.json({ error: "invalid_input", message: "headline must be a non-empty string up to 120 characters" }, { status: 400 });
  }
  if (typeof discountLabel !== "string" || !discountLabel.trim() || discountLabel.length > 60) {
    return NextResponse.json({ error: "invalid_input", message: "discountLabel must be a non-empty string up to 60 characters" }, { status: 400 });
  }
  const hours = Number(durationHours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 30) {
    return NextResponse.json({ error: "invalid_input", message: "durationHours must be a number between 0 and 720 (30 days)" }, { status: 400 });
  }

  const liveSale = setStoreLiveSale(store.id, { headline: headline.trim(), discountLabel: discountLabel.trim(), durationHours: hours });

  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/shops");
  revalidatePath("/");

  return NextResponse.json(liveSale);
}

export async function DELETE(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  clearStoreLiveSale(store.id);

  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/shops");
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}

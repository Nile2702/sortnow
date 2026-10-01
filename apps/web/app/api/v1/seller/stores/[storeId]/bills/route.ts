import { NextRequest, NextResponse } from "next/server";
import { stores, getStoreBills, createBill } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";
import { validateBillInput } from "../../../../../../../lib/validate-bill";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json([], { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const list = getStoreBills(store.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(list);
}

export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_input", message: "Malformed request body." }, { status: 400 });
  }

  const { errors, data } = validateBillInput(body);
  if (!data) {
    return NextResponse.json({ error: "invalid_input", errors }, { status: 400 });
  }

  const result = createBill({
    storeId: store.id,
    items: data.items,
    paymentMode: data.paymentMode,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    discountPercent: data.discountPercent,
  });
  if ("error" in result) {
    return NextResponse.json({ error: "invalid_input", message: result.error }, { status: 400 });
  }
  return NextResponse.json(result.bill, { status: 201 });
}

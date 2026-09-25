import { NextRequest, NextResponse } from "next/server";
import { stores, getBill, voidBill } from "../../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../../lib/auth/require-seller";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string; billId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const bill = getBill(params.billId);
  if (!bill || bill.storeId !== store.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(bill);
}

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string; billId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const existing = getBill(params.billId);
  if (!existing || existing.storeId !== store.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || body.action !== "void") {
    return NextResponse.json({ error: "invalid_input", message: "Only { action: 'void', reason } is supported." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "invalid_input", message: "A reason is required to void a bill." }, { status: 400 });
  }

  const bill = voidBill(params.billId, reason);
  if (!bill) {
    return NextResponse.json({ error: "invalid_input", message: "This bill is already void." }, { status: 400 });
  }
  return NextResponse.json(bill);
}

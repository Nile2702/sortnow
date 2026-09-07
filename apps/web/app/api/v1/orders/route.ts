import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "../../../../lib/seed-data";

export async function POST(req: NextRequest) {
  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }
  const order = createOrder(items);
  return NextResponse.json(order, { status: 201 });
}

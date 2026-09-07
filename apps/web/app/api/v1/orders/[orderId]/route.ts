import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const order = getOrder(params.orderId);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(order);
}

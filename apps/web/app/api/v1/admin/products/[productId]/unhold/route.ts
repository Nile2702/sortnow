import { NextRequest, NextResponse } from "next/server";
import { unholdProduct } from "../../../../../../../lib/seed-data";
import { isValidAdminKey } from "../../../../../../../lib/admin-auth";

// Reverses hold/route.ts - flips a single "on_hold" listing back to
// "live", restoring it to every shopper-facing path. Gated the same way -
// see lib/admin-auth.ts.
export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!isValidAdminKey(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "forbidden", message: "Missing or invalid admin key." }, { status: 403 });
  }

  const updated = await unholdProduct(params.productId);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("redirect") === "1") {
    const back = new URL("/admin/products", req.url);
    back.searchParams.set("key", req.nextUrl.searchParams.get("key") ?? "");
    const q = req.nextUrl.searchParams.get("q");
    const status = req.nextUrl.searchParams.get("status");
    if (q) back.searchParams.set("q", q);
    if (status) back.searchParams.set("status", status);
    return NextResponse.redirect(back, 303);
  }
  return NextResponse.json(updated);
}

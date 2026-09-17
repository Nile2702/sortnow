import { NextRequest, NextResponse } from "next/server";
import { stores, pinCodeIndex, haversineKm } from "../../../../../../lib/seed-data";

// SORT IT OUT is reserve-and-pickup, not shipped delivery - there's no
// "estimated delivery time" to give a shopper, so instead of faking one this
// tells them how far the store actually is from their PIN code, using the
// same pinCodeIndex/haversineKm distance math the homepage's "stores near
// you" and cross-store search already use.
export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const pincode = req.nextUrl.searchParams.get("pincode") ?? "";
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "invalid_pincode", message: "Enter a valid 6-digit PIN code." }, { status: 400 });
  }

  const origin = pinCodeIndex[pincode];
  if (!origin) {
    return NextResponse.json(
      { error: "unknown_pincode", message: "We don't have location data for that PIN code yet." },
      { status: 404 }
    );
  }

  const distanceKm = Math.round(haversineKm(origin.lat, origin.lng, store.latitude, store.longitude) * 10) / 10;
  return NextResponse.json({ distanceKm, storeCity: store.city });
}

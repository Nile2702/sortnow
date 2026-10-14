import { NextRequest, NextResponse } from "next/server";
import { getAllStores } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  // `storeId` also accepts a slug here, since public routes key by slug while
  // internal service-to-service calls (theme/product routes) key by id.
  const stores = await getAllStores();
  const store = stores.find((s) => s.slug === params.storeId || s.id === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // This route is public and unauthenticated (called by anonymous shoppers
  // viewing a reservation's store-visit info, and conveniently reused by the
  // seller dashboard's own hooks for its own store - see lib/use-seller-store.ts
  // and app/seller/(dashboard)/page.tsx). It must never return the KYC/
  // financial identifiers a seller submitted during onboarding (gstin, pan,
  // upiVpa), their OTP-delivery email, or internal review timestamps -
  // anyone, not just that store's own seller, can hit this URL by slug/id.
  // Explicit allow-list rather than destructuring-out the sensitive fields,
  // so a new sensitive field added to Store later doesn't leak here by
  // default - it has to be deliberately added to this list first.
  const {
    id, slug, name, status, category, city, pincode, localMarket, latitude, longitude, liveSale, phone, boostedUntil,
  } = store;
  return NextResponse.json({ id, slug, name, status, category, city, pincode, localMarket, latitude, longitude, liveSale, phone, boostedUntil });
}

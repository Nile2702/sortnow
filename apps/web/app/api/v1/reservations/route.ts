import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { stores, products, createReservation, ReservationItem } from "../../../../lib/seed-data";

interface CartLikeItem extends ReservationItem {
  storeSlug: string;
}

// A shopper's "Sort" list can span multiple stores (cross-store discovery is
// the whole point of "Shop in Sort"), but a reservation is a promise one
// specific shopkeeper holds - so one reservation is created per store, and
// every reservation created here is returned together.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    items: CartLikeItem[];
    shopperName: string;
    shopperPhone: string;
    durationMinutes: number;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { items, shopperName, shopperPhone, durationMinutes } = body;

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return NextResponse.json({ error: "empty_sort" }, { status: 400 });
  }
  if (!shopperName?.trim() || shopperName.length > 120 || !/^\d{10}$/.test(shopperPhone ?? "")) {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }
  const shapeValid = items.every(
    (i) =>
      typeof i?.productId === "string" &&
      i.productId &&
      typeof i?.storeSlug === "string" &&
      i.storeSlug &&
      Number.isFinite(i?.quantity) &&
      Number.isInteger(i.quantity) &&
      i.quantity > 0 &&
      i.quantity <= 20
  );
  if (!shapeValid) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }
  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 7 * 24 * 60) {
    return NextResponse.json({ error: "invalid_duration", message: "durationMinutes must be between 0 and 10080 (7 days)" }, { status: 400 });
  }

  // title and price used to be trusted verbatim from the client - a
  // shopper's own cart state, editable in devtools/localStorage before this
  // request is built - letting a reservation (and the seller's dashboard,
  // SMS notification, and reservation-value reports built from it) show
  // literally any price for literally any product. Re-derived here from the
  // actual Product record instead, and any item whose productId doesn't
  // belong to the storeSlug it claims is dropped rather than trusted.
  const byStoreSlug = new Map<string, ReservationItem[]>();
  for (const item of items) {
    const store = stores.find((s) => s.slug === item.storeSlug);
    const product = products.find((p) => p.id === item.productId && p.storeId === store?.id);
    if (!store || !product) continue;
    const list = byStoreSlug.get(item.storeSlug) ?? [];
    list.push({
      productId: product.id,
      title: product.title,
      size: item.size,
      price: product.basePrice,
      quantity: item.quantity,
      imageUrl: product.images[0]?.url,
    });
    byStoreSlug.set(item.storeSlug, list);
  }
  if (byStoreSlug.size === 0) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  const created = [];
  for (const [storeSlug, storeItems] of byStoreSlug) {
    const store = stores.find((s) => s.slug === storeSlug);
    if (!store) continue;
    const reservation = createReservation({ storeId: store.id, items: storeItems, shopperName, shopperPhone, durationMinutes: duration });
    if (reservation) {
      revalidateTag(`reservations:${store.id}`);
      created.push(reservation);
    }
  }

  if (created.length === 0) return NextResponse.json({ error: "no_valid_stores" }, { status: 400 });
  return NextResponse.json(created, { status: 201 });
}

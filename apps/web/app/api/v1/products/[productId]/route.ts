import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, getAllStores, getColorSiblings, applyActiveSales } from "../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const products = await getAllProducts();
  const product = products.find((p) => p.id === params.productId);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === product.storeId);
  // Public, shopper-facing route - a product on hold, or one belonging to
  // a store that isn't "active" (suspended, draft, ...), must 404 the same
  // as app/store/[slug]/page.tsx does for the store itself, rather than
  // leaking it to anyone who already has the product's URL/id.
  if (product.status === "on_hold" || !store || store.status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const colorVariants = (await getColorSiblings(product))
    .filter((p) => p.status !== "on_hold")
    .map((p) => ({ id: p.id, color: p.color, thumbnail: p.images[0]?.url }))
    .filter((v) => v.color);

  // costPrice is the seller's own purchase cost, never meant to leave the
  // seller dashboard (see Product.costPrice) - this is a shopper-facing
  // route, so it's stripped before responding rather than spread straight
  // through.
  const { costPrice: _costPrice, ...publicProduct } = product;
  const [withSale] = await applyActiveSales([publicProduct]);
  // `store` (from getAllStores()) carries the seller's full business record -
  // decrypted gstin/pan/upiVpa, email, legalBusinessName, etc. This is a
  // public, unauthenticated route, so only an explicit allow-list of fields
  // a shopper actually needs (and that are already shown elsewhere on the
  // storefront) may leave this response - never spread the full record.
  const publicStore = {
    name: store.name,
    city: store.city,
    localMarket: store.localMarket,
    pincode: store.pincode,
    latitude: store.latitude,
    longitude: store.longitude,
    phone: store.phone,
  };
  return NextResponse.json({ ...withSale, store: publicStore, colorVariants });
}

import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, getAllStores } from "../../../../../../lib/seed-data";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  // Public, shopper-facing route - a store that isn't "active" (draft,
  // pending_review, suspended, closed) must not leak its catalog here, the
  // same as app/store/[slug]/page.tsx 404ing outright for a non-active
  // store.
  if (!store || store.status !== "active") return NextResponse.json([], { status: 404 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort");
  const limit = Number(searchParams.get("limit") ?? "8");
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;

  const products = await getAllProducts();
  // A product on hold (see Product.status) must not appear here either,
  // same reasoning as the store-level filter above.
  let list = products.filter((p) => p.storeId === store.id && p.status !== "on_hold");
  if (category) list = list.filter((p) => p.categoryId === category);
  if (minPrice != null) list = list.filter((p) => p.basePrice >= minPrice);
  if (maxPrice != null) list = list.filter((p) => p.basePrice <= maxPrice);

  if (sort === "newest") list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (sort === "price_asc") list = [...list].sort((a, b) => a.basePrice - b.basePrice);
  if (sort === "price_desc") list = [...list].sort((a, b) => b.basePrice - a.basePrice);

  // Public, shopper-facing route - costPrice (the seller's own purchase
  // cost) must never leave the seller dashboard, see Product.costPrice.
  const publicList = list.slice(0, limit).map(({ costPrice: _costPrice, ...p }) => p);
  return NextResponse.json(publicList);
}

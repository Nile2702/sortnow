import { NextRequest, NextResponse } from "next/server";
import { products, stores } from "../../../../../../lib/seed-data";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json([], { status: 404 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort");
  const limit = Number(searchParams.get("limit") ?? "8");
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;

  let list = products.filter((p) => p.storeId === store.id);
  if (category) list = list.filter((p) => p.categoryId === category);
  if (minPrice != null) list = list.filter((p) => p.basePrice >= minPrice);
  if (maxPrice != null) list = list.filter((p) => p.basePrice <= maxPrice);

  if (sort === "newest") list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (sort === "price_asc") list = [...list].sort((a, b) => a.basePrice - b.basePrice);
  if (sort === "price_desc") list = [...list].sort((a, b) => b.basePrice - a.basePrice);

  return NextResponse.json(list.slice(0, limit));
}

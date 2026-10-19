import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAllStores, getStoreProducts, createSaleCampaign, getSaleCampaignsForStore } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";
import { CATEGORY_TREE } from "../../../../../../../lib/catalog-constants";

// Seller-facing: every campaign for their own store, past/active/upcoming -
// the Promotions page's management list.
export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json([], { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;
  return NextResponse.json(await getSaleCampaignsForStore(store.id));
}

export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { name, discountType, discountValue, scope, gender, subCategory, productIds, startsAt, endsAt } = body ?? {};

  if (typeof name !== "string" || !name.trim() || name.length > 120) {
    return NextResponse.json({ error: "invalid_input", message: "name must be a non-empty string up to 120 characters" }, { status: 400 });
  }
  if (discountType !== "percent" && discountType !== "flat") {
    return NextResponse.json({ error: "invalid_input", message: "discountType must be 'percent' or 'flat'" }, { status: 400 });
  }
  const value = Number(discountValue);
  if (!Number.isFinite(value) || value <= 0 || (discountType === "percent" && value > 90)) {
    return NextResponse.json(
      { error: "invalid_input", message: discountType === "percent" ? "discountValue must be between 0 and 90" : "discountValue must be greater than 0" },
      { status: 400 }
    );
  }
  if (scope !== "all" && scope !== "category" && scope !== "products") {
    return NextResponse.json({ error: "invalid_input", message: "scope must be 'all', 'category', or 'products'" }, { status: 400 });
  }

  let normalizedGender: string | undefined;
  let normalizedSubCategory: string | undefined;
  if (scope === "category") {
    const tree = CATEGORY_TREE.find((c) => c.value === gender);
    if (!tree || typeof subCategory !== "string" || !tree.subCategories.includes(subCategory)) {
      return NextResponse.json({ error: "invalid_input", message: "gender/subCategory must be a real category pairing" }, { status: 400 });
    }
    normalizedGender = gender;
    normalizedSubCategory = subCategory;
  }

  let normalizedProductIds: string[] | undefined;
  if (scope === "products") {
    if (!Array.isArray(productIds) || productIds.length === 0 || !productIds.every((id: unknown) => typeof id === "string")) {
      return NextResponse.json({ error: "invalid_input", message: "productIds must be a non-empty array of product ids" }, { status: 400 });
    }
    // Ownership check - a seller must only ever be able to target their own
    // catalog, never craft a request naming another store's product ids.
    const ownProducts = await getStoreProducts(store.id);
    const ownIds = new Set(ownProducts.map((p) => p.id));
    if (!productIds.every((id: string) => ownIds.has(id))) {
      return NextResponse.json({ error: "invalid_input", message: "One or more productIds don't belong to this store" }, { status: 400 });
    }
    normalizedProductIds = productIds;
  }

  const end = new Date(endsAt);
  if (!endsAt || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "invalid_input", message: "endsAt must be a valid date" }, { status: 400 });
  }
  const start = startsAt ? new Date(startsAt) : new Date();
  if (startsAt && Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "invalid_input", message: "startsAt must be a valid date" }, { status: 400 });
  }
  if (end.getTime() <= start.getTime()) {
    return NextResponse.json({ error: "invalid_input", message: "endsAt must be after startsAt" }, { status: 400 });
  }
  if (end.getTime() - start.getTime() > 1000 * 60 * 60 * 24 * 90) {
    return NextResponse.json({ error: "invalid_input", message: "A campaign can't run longer than 90 days" }, { status: 400 });
  }

  const campaign = await createSaleCampaign(store.id, {
    name: name.trim(),
    discountType,
    discountValue: value,
    scope,
    gender: normalizedGender as any,
    subCategory: normalizedSubCategory,
    productIds: normalizedProductIds,
    startsAt: startsAt ? start.toISOString() : undefined,
    endsAt: end.toISOString(),
  });

  // Shopper-facing pricing changes immediately, not after the store page's
  // own 60s ISR window - same revalidation targets as the live-sale route.
  revalidateTag(`store:${store.slug}`);
  revalidatePath(`/store/${store.slug}`);
  revalidatePath("/search");
  revalidatePath("/");

  return NextResponse.json(campaign, { status: 201 });
}

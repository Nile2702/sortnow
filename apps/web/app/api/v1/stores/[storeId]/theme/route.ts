import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { themes, stores, updateStoreTheme } from "../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../lib/auth/require-seller";
import { getHeroBackgroundById } from "../../../../../../lib/hero-backgrounds";

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const theme = themes[store.id];
  if (!theme) return NextResponse.json({ error: "no_theme" }, { status: 404 });
  return NextResponse.json(theme);
}

export async function PATCH(req: NextRequest, { params }: { params: { storeId: string } }) {
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json();
  const { primary, accent, heroTitle, heroSubtitle, backgroundId } = body ?? {};
  const HEX_COLOR = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

  if (primary !== undefined && (typeof primary !== "string" || !HEX_COLOR.test(primary))) {
    return NextResponse.json({ error: "invalid_input", message: "primary must be a hex color like #0d9488" }, { status: 400 });
  }
  if (accent !== undefined && (typeof accent !== "string" || !HEX_COLOR.test(accent))) {
    return NextResponse.json({ error: "invalid_input", message: "accent must be a hex color like #0d9488" }, { status: 400 });
  }
  if (heroTitle !== undefined && (typeof heroTitle !== "string" || heroTitle.length > 120)) {
    return NextResponse.json({ error: "invalid_input", message: "heroTitle must be a string up to 120 characters" }, { status: 400 });
  }
  if (heroSubtitle !== undefined && (typeof heroSubtitle !== "string" || heroSubtitle.length > 240)) {
    return NextResponse.json({ error: "invalid_input", message: "heroSubtitle must be a string up to 240 characters" }, { status: 400 });
  }
  if (backgroundId !== undefined && backgroundId !== null && !getHeroBackgroundById(backgroundId)) {
    return NextResponse.json({ error: "invalid_input", message: "backgroundId is not a recognized hero background." }, { status: 400 });
  }

  const updated = updateStoreTheme(store.id, { primary, accent, heroTitle, heroSubtitle, backgroundId });
  if (!updated) return NextResponse.json({ error: "no_theme" }, { status: 404 });

  // Bust both the theme fetch cache and the storefront page's ISR cache so
  // Theme Studio changes go live immediately instead of waiting out the
  // normal 600s/60s revalidation windows.
  revalidateTag(`theme:${store.id}`);
  revalidatePath(`/store/${store.slug}`);

  return NextResponse.json(updated);
}

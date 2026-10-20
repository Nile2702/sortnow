import { NextRequest, NextResponse } from "next/server";
import { getAllStores, getGeminiApiKey, updateStoreGeminiKey } from "../../../../../../../lib/seed-data";
import { requireSellerForStore } from "../../../../../../../lib/auth/require-seller";

// Never returns the key itself back to the client, even to its own owner -
// once saved, this is a write-mostly secret. A short suffix is enough for a
// seller to recognize "yes, that's the key I pasted in" without this
// response (or anything logging it) carrying the full value.
function preview(key: string): string {
  return `••••${key.slice(-4)}`;
}

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const key = await getGeminiApiKey(store.id);
  return NextResponse.json({ hasKey: !!key, keyPreview: key ? preview(key) : null });
}

export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);
  if (!store) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const denied = requireSellerForStore(store.id, store.slug);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const rawKey = body?.apiKey;

  // null/empty clears it - the settings UI's "Remove key" action.
  if (rawKey === null || rawKey === "") {
    await updateStoreGeminiKey(store.id, null);
    return NextResponse.json({ hasKey: false, keyPreview: null });
  }

  if (typeof rawKey !== "string") {
    return NextResponse.json({ error: "invalid_input", message: "apiKey must be a string." }, { status: 400 });
  }
  const key = rawKey.trim();
  // A loose sanity check, not a strict format validator - Google's own key
  // format could change, and the real test of validity is the next actual
  // Gemini call succeeding or failing.
  if (key.length < 20 || key.length > 200) {
    return NextResponse.json({ error: "invalid_input", message: "That doesn't look like a valid Gemini API key." }, { status: 400 });
  }

  await updateStoreGeminiKey(store.id, key);
  return NextResponse.json({ hasKey: true, keyPreview: preview(key) });
}

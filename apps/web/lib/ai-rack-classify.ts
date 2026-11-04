// Classifies a product photo as a hanger/mannequin/flat-lay shot (no visible
// person) vs. a model/lifestyle photo (someone wearing it) - used to decide
// which products are eligible for the homepage's ClothesRackHero, which only
// makes sense for garments shown the way they'd actually hang on a rack, not
// a photo of someone's face and torso.
//
// Same pattern as lib/ai-product-autofill.ts: a vision *understanding* call
// (reads the photo, returns JSON), not image generation, so it runs on the
// platform's own shared GEMINI_API_KEY rather than a seller's own key - see
// that file's own note on why this class of call is treated differently
// from lib/ai-photo-enhance.ts's paid, per-seller-key image generation.
const GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.5-flash-lite";

const PROMPT = `Look at this product image from a fashion marketplace.

First, check whether this is an actual PHOTOGRAPH of a real garment - not a placeholder, icon, solid
color block, illustration, drawing, graphic design, or any other non-photographic image. Some listings
on this marketplace use a plain colored placeholder graphic with the product name as text instead of a
real photo - that counts as NOT a real photo.

If it is a real photograph, decide whether the garment is shown WITHOUT a visible person wearing it -
on a hanger, a mannequin or ghost-mannequin form, laid flat, or otherwise photographed on its own - or
WITH a person visibly wearing it (any part of a person's skin, face, or body is visible modeling it).

Return JSON with these fields:
- isRealPhoto: true only if this is an actual photograph of the garment, false for any placeholder,
  illustration, icon, or graphic.
- isHangerOrFlatShot: true only if isRealPhoto is true AND no person is visibly wearing the garment
  (hanger, mannequin, flat-lay, product-only shot). False if isRealPhoto is false, or if a person is
  visibly modeling it.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    isRealPhoto: { type: "BOOLEAN" },
    isHangerOrFlatShot: { type: "BOOLEAN" },
  },
  required: ["isRealPhoto", "isHangerOrFlatShot"],
};

export type RackClassifyResult = { ok: true; isHangerOrFlatShot: boolean } | { ok: false; error: string };

async function fetchAsBase64(imageUrl: string): Promise<{ mimeType: string; base64: string } | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    if (!mimeType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { mimeType, base64: buf.toString("base64") };
  } catch {
    return null;
  }
}

// One classification call for one image URL - the caller (the rack API
// route) is responsible for caching the result so this never runs twice for
// the same product, and for capping how many candidates it calls this on
// per request.
export async function classifyIsHangerShot(imageUrl: string): Promise<RackClassifyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "not_configured" };

  const image = await fetchAsBase64(imageUrl);
  if (!image) return { ok: false, error: "invalid_image" };

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: image.mimeType, data: image.base64 } }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
      }),
    });
  } catch {
    return { ok: false, error: "upstream_error" };
  }
  if (!response.ok) {
    console.error("[ai-rack-classify] Gemini API error:", response.status, await response.text().catch(() => ""));
    return { ok: false, error: "upstream_error" };
  }

  const json = await response.json().catch(() => null);
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, error: "no_result" };

  try {
    const parsed = JSON.parse(text);
    return { ok: true, isHangerOrFlatShot: !!parsed.isHangerOrFlatShot };
  } catch {
    return { ok: false, error: "no_result" };
  }
}

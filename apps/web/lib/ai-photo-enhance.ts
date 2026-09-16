// Paid second stage of the photo pipeline (see components/ProductForm.tsx):
// free client-side background removal (lib client code, @imgly/background-
// removal) runs first, so by the time an image reaches here it typically
// already has a plain/transparent background. This step's job is placing
// the garment on a mannequin - a real generative-AI task with no free-tier
// equivalent, which is why it's metered against a store's photoCredits
// (see lib/seed-data.ts) rather than being unlimited like background
// removal. Still handles a raw, unedited photo reasonably (the prompt is
// written to not assume a clean background), since a seller can also run
// this step directly without bothering with background removal first.
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

const PROMPT = `You are editing a product photo for an online clothing marketplace.
Take the garment shown in this photo and produce a professional e-commerce
product image of it:
- If the photo still has its original background (not already removed),
  remove it completely and replace it with a plain, seamless light-gray or
  white studio background. If the background has already been removed
  (transparent or plain), keep it that way.
- Present the garment on a plain, faceless mannequin form (or a
  ghost-mannequin / invisible-mannequin effect) so it looks worn and shows
  its natural shape and drape, rather than lying flat.
- Keep the garment's actual color, pattern, fabric texture, and design
  completely unchanged - do not invent new colors or patterns.
- Do not add any text, watermark, logo, or additional objects.
- Use soft, even studio lighting typical of e-commerce catalog photography.
Return only the edited image.`;

export type EnhanceResult =
  | { ok: true; imageDataUrl: string }
  | { ok: false; code: "not_configured" | "invalid_image" | "upstream_error" | "no_image_returned"; error: string };

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function enhanceProductPhoto(inputDataUrl: string): Promise<EnhanceResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "not_configured", error: "AI photo enhancement isn't configured on this deployment yet (missing GEMINI_API_KEY)." };
  }

  const parsed = parseDataUrl(inputDataUrl);
  if (!parsed) {
    return { ok: false, code: "invalid_image", error: "Unsupported image format." };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: PROMPT }, { inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } }],
            },
          ],
        }),
      }
    );
  } catch (err) {
    return { ok: false, code: "upstream_error", error: "Couldn't reach the AI photo service. Try again in a moment." };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[ai-photo-enhance] Gemini API error:", response.status, detail);
    return { ok: false, code: "upstream_error", error: "The AI photo service returned an error. Try again, or use the original photo." };
  }

  const json = await response.json().catch(() => null);
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);

  if (!imagePart) {
    console.error("[ai-photo-enhance] No image returned by Gemini:", JSON.stringify(json)?.slice(0, 500));
    return { ok: false, code: "no_image_returned", error: "The AI couldn't generate an enhanced photo for this image. Try a clearer, well-lit original photo." };
  }

  const inline = imagePart.inlineData ?? imagePart.inline_data;
  const mimeType = inline.mimeType ?? inline.mime_type ?? "image/png";
  const data = inline.data;

  return { ok: true, imageDataUrl: `data:${mimeType};base64,${data}` };
}

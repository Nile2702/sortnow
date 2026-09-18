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

const MANNEQUIN_PROMPT = `You are editing a product photo for an online clothing marketplace.
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

// For the common case of a seller re-photographing a physical, printed
// product photo (a catalog page, banner, or poster showing a model already
// wearing the garment) instead of a direct digital photo - very different
// starting point from the mannequin prompt above, since a person is already
// in frame and the defects are print-specific, not lighting/background ones.
const RESTORE_REAL_PHOTO_PROMPT = `You are restoring a product photo for an online clothing marketplace.
The source image is a photo taken of a physical, printed copy of a product photo - for example, a
photo of a catalog page, banner, or poster that shows a model wearing this garment - rather than a
direct digital photograph. It likely carries print-specific defects from being re-photographed off
paper or a glossy surface.

Produce a clean, natural digital photograph of the same scene, as if it had been captured directly by
a camera rather than photographed off print media:
- Remove moiré patterns, halftone dot-matrix texture, paper grain, and glare or reflections caused by
  photographing a printed or glossy surface.
- Reconstruct the fabric so it reads as real cloth: a natural weave and texture, believable folds and
  draping, and lighting that responds to the fabric's actual shape instead of looking flat or printed on.
- Render the model's skin, hair, and face so they blend naturally into the photo, with soft, believable
  shadows where the clothing meets the body and background - avoid any flat, cut-out, or poster-like look.
- Sharpen and clarify fine garment details (stitching, embroidery, buttons, prints) and clean up any
  jagged or clipped edges around the model's silhouette, upscaling to a clean, high-resolution result.
- Keep the garment's actual color, pattern, and design completely unchanged, and keep the same pose,
  framing, and person - do not invent new colors, patterns, or people.
- Do not add any text, watermark, logo, or additional objects.
Return only the restored image.`;

export type EnhanceMode = "mannequin" | "restore";

export type EnhanceResult =
  | { ok: true; imageDataUrl: string }
  | { ok: false; code: "not_configured" | "invalid_image" | "upstream_error" | "no_image_returned"; error: string };

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function callGeminiImageEdit(inputDataUrl: string, prompt: string, errorContext: string): Promise<EnhanceResult> {
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
              parts: [{ text: prompt }, { inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } }],
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
    console.error(`[ai-photo-enhance:${errorContext}] Gemini API error:`, response.status, detail);
    return { ok: false, code: "upstream_error", error: "The AI photo service returned an error. Try again, or use the original photo." };
  }

  const json = await response.json().catch(() => null);
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);

  if (!imagePart) {
    console.error(`[ai-photo-enhance:${errorContext}] No image returned by Gemini:`, JSON.stringify(json)?.slice(0, 500));
    return { ok: false, code: "no_image_returned", error: "The AI couldn't generate an enhanced photo for this image. Try a clearer, well-lit original photo." };
  }

  const inline = imagePart.inlineData ?? imagePart.inline_data;
  const mimeType = inline.mimeType ?? inline.mime_type ?? "image/png";
  const data = inline.data;

  return { ok: true, imageDataUrl: `data:${mimeType};base64,${data}` };
}

export async function enhanceProductPhoto(inputDataUrl: string): Promise<EnhanceResult> {
  return callGeminiImageEdit(inputDataUrl, MANNEQUIN_PROMPT, "mannequin");
}

// Note on scope: this is a single generative image-edit call, prompted to
// target the specific defects described above (moiré/halftone/glare removal,
// natural fabric and skin rendering, edge cleanup, upscaling). It's Gemini's
// own image model doing the reconstruction from a text description of the
// desired result - there's no physically-based rendering or guaranteed
// pixel-level fidelity here, and results will vary with source photo
// quality, the same as the mannequin-generation step above.
export async function restoreRealPhoto(inputDataUrl: string): Promise<EnhanceResult> {
  return callGeminiImageEdit(inputDataUrl, RESTORE_REAL_PHOTO_PROMPT, "restore");
}

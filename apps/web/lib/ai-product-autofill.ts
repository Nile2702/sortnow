// AI listing autofill: a seller uploads a raw product photo (optionally with
// a short hint like "top wear" or "kids saree") and gets back a suggested
// title, category, description, and fabric guess - turning one photo + a
// few words into a mostly-filled listing instead of a blank form.
//
// Unlike lib/ai-photo-enhance.ts (image generation, no free tier at all),
// this is a vision *understanding* task - the model reads the photo and
// returns text/JSON, not a new image. Google's free tier generally does
// cover this kind of call for the standard flash model, so this is NOT
// gated behind photoCredits the way mannequin placement is - though that
// assumption should be watched once real usage happens, since Google's
// exact free-tier terms can change.
import { CATEGORY_TREE } from "./catalog-constants";

const GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.6-flash";

const CATEGORY_GUIDE = CATEGORY_TREE.map((c) => `- ${c.value}: ${c.subCategories.join(", ")}`).join("\n");

function buildPrompt(hint: string | undefined): string {
  return `You are helping a small Indian fashion retailer list a product on an online marketplace.
Look at the attached photo of a garment${hint ? ` and this hint from the seller: "${hint}"` : ""}.

Suggest listing details for this product. Use the hint (if given) to guide the category and
description, but rely on the photo for anything the hint doesn't cover.

Valid gender/subCategory combinations (pick exactly one subCategory from the matching gender's list):
${CATEGORY_GUIDE}

Return your answer as JSON with these fields:
- title: a short, specific product title an Indian shopper would recognize, always including the primary color and garment type (e.g. "Cotton Round-Neck T-Shirt — Navy Blue"), under 70 characters.
- gender: one of "men", "women", "kids" - whichever the garment is for.
- subCategory: exactly one value from that gender's list above.
- description: a detailed, factual product description (3-5 sentences) that captures every visible detail, written as continuous prose (not bullet points):
  - Primary and any secondary colors, named specifically (e.g. "navy blue", "maroon with gold zari", not just "dark" or "bright").
  - Pattern or print, if any (solid, striped, floral, embroidered, block-printed, checked, etc.) - say "solid" if plain.
  - Style and cut details visible in the photo: neckline (round-neck, collared, V-neck...), sleeve length (sleeveless, short, full), fit (slim, regular, loose), length, and any notable design elements (buttons, zippers, embroidery, borders, prints).
  - Fabric texture and likely material, based on how it looks (sheen, weave, drape).
  - Who it suits and when it'd be worn (casual, festive, formal, daily wear), based on gender and style.
  Do not invent details you can't infer from the photo, and do not exaggerate with marketing fluff like "must-have" or "stunning" - stay factual and specific.
  Write every sentence as a direct, confident statement of fact about the product, the way a retailer's own catalog copy reads.
  Never hedge or narrate your own uncertainty - do not use phrases like "appears to be", "seems to", "looks like", "likely", "possibly",
  "it can be seen that", or similar. State what the garment is and has, plainly (e.g. "The kurti is maroon with gold embroidery on the neckline"
  - not "The kurti appears to be maroon and seems to have some embroidery").
- fabric: your best guess at the fabric (e.g. "Cotton", "Silk", "Denim") from visual texture, or an empty string if you can't tell.

If the photo doesn't clearly show a garment, still make your best guess rather than refusing.`;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    gender: { type: "STRING", enum: ["men", "women", "kids"] },
    subCategory: { type: "STRING" },
    description: { type: "STRING" },
    fabric: { type: "STRING" },
  },
  required: ["title", "gender", "subCategory", "description", "fabric"],
};

export interface AutofillSuggestion {
  title: string;
  gender: "men" | "women" | "kids";
  subCategory: string;
  description: string;
  fabric: string;
}

export type AutofillResult =
  | { ok: true; suggestion: AutofillSuggestion }
  | { ok: false; code: "not_configured" | "invalid_image" | "upstream_error" | "no_result"; error: string };

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function autofillProductDetails(inputDataUrl: string, hint: string | undefined): Promise<AutofillResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "not_configured", error: "AI autofill isn't configured on this deployment yet (missing GEMINI_API_KEY)." };
  }

  const parsed = parseDataUrl(inputDataUrl);
  if (!parsed) {
    return { ok: false, code: "invalid_image", error: "Unsupported image format." };
  }

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(hint) }, { inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch (err) {
    return { ok: false, code: "upstream_error", error: "Couldn't reach the AI service. Try again in a moment." };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[ai-product-autofill] Gemini API error:", response.status, detail);
    return { ok: false, code: "upstream_error", error: "The AI service returned an error. Try again, or fill in the details yourself." };
  }

  const json = await response.json().catch(() => null);
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[ai-product-autofill] No text returned by Gemini:", JSON.stringify(json)?.slice(0, 500));
    return { ok: false, code: "no_result", error: "The AI couldn't suggest details for this photo. Try a clearer photo or fill in the details yourself." };
  }

  let parsedSuggestion: AutofillSuggestion;
  try {
    parsedSuggestion = JSON.parse(text);
  } catch {
    return { ok: false, code: "no_result", error: "The AI's response wasn't understandable. Try again." };
  }

  const validGenders = CATEGORY_TREE.map((c) => c.value);
  if (!validGenders.includes(parsedSuggestion.gender)) {
    return { ok: false, code: "no_result", error: "The AI suggested an invalid category. Try again." };
  }
  const validSubCategories = CATEGORY_TREE.find((c) => c.value === parsedSuggestion.gender)?.subCategories ?? [];
  if (!validSubCategories.includes(parsedSuggestion.subCategory)) {
    // Fall back to the first subcategory for that gender rather than failing outright -
    // the model got the gender right, just not the exact subcategory label.
    parsedSuggestion.subCategory = validSubCategories[0] ?? parsedSuggestion.subCategory;
  }

  return { ok: true, suggestion: parsedSuggestion };
}

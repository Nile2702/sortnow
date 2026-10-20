import { NextRequest, NextResponse } from "next/server";
import { getSellerSession } from "../../../../../lib/auth/require-seller";
import { enhanceProductPhoto, restoreRealPhoto } from "../../../../../lib/ai-photo-enhance";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";
import { getGeminiApiKey } from "../../../../../lib/seed-data";

const MAX_DATA_URL_LENGTH = 6_000_000; // ~4.3MB raw image after base64 overhead, matching the 3MB upload cap client-side

// Image generation (not just vision/text) is slower than photo-autofill's
// classification call and has no retry loop to budget for, but is still
// well past a default 10s Serverless Function timeout in practice - same
// fix as photo-autofill/route.ts for the same reason.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to the Seller Portal first." }, { status: 401 });
  }

  // Each call is a real, paid external API request - cap it well below the
  // free-form write endpoints elsewhere.
  const { ok: withinLimit } = rateLimit(`photo-enhance:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!withinLimit) {
    return NextResponse.json({ error: "rate_limited", message: "Too many AI enhancement requests this hour. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const imageDataUrl = body?.imageDataUrl;
  const mode = body?.mode === "restore" ? "restore" : "mannequin";

  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_input", message: "imageDataUrl must be a data: URL for an image." }, { status: 400 });
  }
  if (imageDataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "invalid_input", message: "Image is too large. Please use a photo under 3MB." }, { status: 400 });
  }

  const apiKey = await getGeminiApiKey(session.storeId);
  if (!apiKey) {
    return NextResponse.json(
      { error: "no_gemini_key", message: "Add your free Gemini API key in Settings to use this feature." },
      { status: 402 }
    );
  }

  const result = mode === "restore" ? await restoreRealPhoto(apiKey, imageDataUrl) : await enhanceProductPhoto(apiKey, imageDataUrl);
  if (!result.ok) {
    const status = result.code === "not_configured" ? 503 : result.code === "invalid_image" ? 400 : 502;
    return NextResponse.json({ error: result.code, message: result.error }, { status });
  }

  return NextResponse.json({ imageDataUrl: result.imageDataUrl });
}

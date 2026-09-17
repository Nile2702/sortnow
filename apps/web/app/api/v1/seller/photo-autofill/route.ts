import { NextRequest, NextResponse } from "next/server";
import { getSellerSession } from "../../../../../lib/auth/require-seller";
import { autofillProductDetails } from "../../../../../lib/ai-product-autofill";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

const MAX_DATA_URL_LENGTH = 6_000_000; // ~4.3MB raw image after base64 overhead, matching the 3MB upload cap client-side
const MAX_HINT_LENGTH = 200;

export async function POST(req: NextRequest) {
  const session = getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to the Seller Portal first." }, { status: 401 });
  }

  // Not credit-metered like photo-enhance (this is a vision/text call, not
  // image generation, and typically free-tier eligible) - still rate
  // limited so it can't be used to hammer the API endlessly.
  const { ok: withinLimit } = rateLimit(`photo-autofill:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!withinLimit) {
    return NextResponse.json({ error: "rate_limited", message: "Too many autofill requests this hour. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const imageDataUrl = body?.imageDataUrl;
  const hint = body?.hint;

  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_input", message: "imageDataUrl must be a data: URL for an image." }, { status: 400 });
  }
  if (imageDataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "invalid_input", message: "Image is too large. Please use a photo under 3MB." }, { status: 400 });
  }
  if (hint !== undefined && (typeof hint !== "string" || hint.length > MAX_HINT_LENGTH)) {
    return NextResponse.json({ error: "invalid_input", message: `hint must be a string up to ${MAX_HINT_LENGTH} characters.` }, { status: 400 });
  }

  const result = await autofillProductDetails(imageDataUrl, hint || undefined);
  if (!result.ok) {
    const status =
      result.code === "not_configured"
        ? 503
        : result.code === "invalid_image"
          ? 400
          : result.code === "content_blocked"
            ? 422
            : 502;
    return NextResponse.json({ error: result.code, message: result.error }, { status });
  }

  return NextResponse.json(result.suggestion);
}

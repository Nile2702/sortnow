import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSellerSession } from "../../../../../lib/auth/require-seller";
import { rateLimit, clientIp } from "../../../../../lib/rate-limit";

// Server-side home for product photo storage - replaces the old approach of
// embedding the final base64 data URL directly in Product.images (see
// components/ProductForm.tsx / the bulk-photos page), which bloated every
// product row and every list/search API response that included it. The
// client still does all its own processing (background removal, auto-align/
// enhance, optional Gemini mannequin placement) entirely client-side and
// ends up with a final data URL exactly as before - this endpoint is only
// the last step, uploading that finished image to Cloudinary and handing
// back a normal https:// URL to store instead.
const MAX_DATA_URL_LENGTH = 8_000_000; // ~5.7MB raw image after base64 overhead - generous headroom over the 3MB client upload cap, since enhancement steps can grow a file somewhat.

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  const session = getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to the Seller Portal first." }, { status: 401 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: "not_configured", message: "Image storage isn't configured on this server." },
      { status: 503 }
    );
  }

  // Generous but bounded - an upload is cheap compared to the paid AI calls
  // above it in the pipeline, but still shouldn't be free to hammer.
  const { ok: withinLimit } = rateLimit(`upload:${clientIp(req)}`, 60, 60 * 60 * 1000);
  if (!withinLimit) {
    return NextResponse.json({ error: "rate_limited", message: "Too many uploads this hour. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const imageDataUrl = body?.imageDataUrl;

  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_input", message: "imageDataUrl must be a data: URL for an image." }, { status: 400 });
  }
  if (imageDataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "invalid_input", message: "Image is too large. Please use a photo under 3MB." }, { status: 400 });
  }

  try {
    const result = await cloudinary.uploader.upload(imageDataUrl, {
      // Scoped per-store so a seller's assets are organized and a future
      // "delete this store's media" cleanup can target just this folder.
      folder: `sortnow/products/${session.storeId}`,
      resource_type: "image",
    });
    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    // Cloudinary's own validation errors (corrupt image, unsupported format)
    // surface as http_code 400 on the thrown error - everything else (auth
    // misconfiguration, network issues, rate limits on their end) is treated
    // as an upstream failure so a seller sees a retryable message instead of
    // this silently corrupting the product-save flow with a broken image URL.
    const status = err?.http_code === 400 ? 400 : 502;
    const message =
      status === 400
        ? "Couldn't process this image. Try a different photo."
        : "Couldn't upload this photo right now. Try again in a moment.";
    return NextResponse.json({ error: "upload_failed", message }, { status });
  }
}

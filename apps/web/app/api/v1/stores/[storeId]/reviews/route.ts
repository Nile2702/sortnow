import { NextRequest, NextResponse } from "next/server";
import { stores, getStoreReviews, getStoreRatingSummary, addStoreReview } from "../../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";

// `storeId` also accepts a slug, matching every other /stores/[storeId]
// route - the storefront page itself only knows the slug.
function resolveStoreId(storeId: string) {
  return stores.find((s) => s.slug === storeId || s.id === storeId)?.id;
}

export async function GET(_req: NextRequest, { params }: { params: { storeId: string } }) {
  const id = resolveStoreId(params.storeId);
  if (!id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    reviews: getStoreReviews(id),
    summary: getStoreRatingSummary(id),
  });
}

export async function POST(req: NextRequest, { params }: { params: { storeId: string } }) {
  const { ok } = rateLimit(`store-review:${clientIp(req)}`, 10, 60_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const id = resolveStoreId(params.storeId);
  if (!id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_input", message: "rating must be a number from 1 to 5" }, { status: 400 });
  }
  if (typeof body.comment !== "string" || !body.comment.trim() || body.comment.length > 2000) {
    return NextResponse.json({ error: "invalid_input", message: "comment must be a non-empty string up to 2000 characters" }, { status: 400 });
  }
  if (body.authorName !== undefined && (typeof body.authorName !== "string" || body.authorName.length > 120)) {
    return NextResponse.json({ error: "invalid_input", message: "authorName must be a string up to 120 characters" }, { status: 400 });
  }

  const review = addStoreReview(id, {
    authorName: body.authorName,
    rating,
    comment: body.comment.trim(),
  });
  return NextResponse.json(review, { status: 201 });
}

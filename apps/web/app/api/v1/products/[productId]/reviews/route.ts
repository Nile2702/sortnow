import { NextRequest, NextResponse } from "next/server";
import { getProductReviews, getRatingSummary, addReview, products } from "../../../../../../lib/seed-data";
import { rateLimit, clientIp } from "../../../../../../lib/rate-limit";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  return NextResponse.json({
    reviews: getProductReviews(params.productId),
    summary: getRatingSummary(params.productId),
  });
}

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const { ok } = rateLimit(`review:${clientIp(req)}`, 10, 60_000);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  if (!products.some((p) => p.id === params.productId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_input", message: "rating must be a number from 1 to 5" }, { status: 400 });
  }
  if (typeof body.comment !== "string" || !body.comment.trim() || body.comment.length > 2000) {
    return NextResponse.json({ error: "invalid_input", message: "comment must be a non-empty string up to 2000 characters" }, { status: 400 });
  }
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.length > 120)) {
    return NextResponse.json({ error: "invalid_input", message: "title must be a string up to 120 characters" }, { status: 400 });
  }
  if (body.authorName !== undefined && (typeof body.authorName !== "string" || body.authorName.length > 120)) {
    return NextResponse.json({ error: "invalid_input", message: "authorName must be a string up to 120 characters" }, { status: 400 });
  }

  const review = addReview(params.productId, {
    authorName: body.authorName,
    rating,
    title: body.title,
    comment: body.comment.trim(),
  });
  return NextResponse.json(review, { status: 201 });
}

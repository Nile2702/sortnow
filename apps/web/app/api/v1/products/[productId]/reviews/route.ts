import { NextRequest, NextResponse } from "next/server";
import { getProductReviews, getRatingSummary, addReview } from "../../../../../../lib/seed-data";

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  return NextResponse.json({
    reviews: getProductReviews(params.productId),
    summary: getRatingSummary(params.productId),
  });
}

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const body = await req.json();
  if (!body.comment || !body.rating) {
    return NextResponse.json({ error: "rating_and_comment_required" }, { status: 400 });
  }
  const review = addReview(params.productId, {
    authorName: body.authorName,
    rating: Number(body.rating),
    title: body.title,
    comment: body.comment,
  });
  return NextResponse.json(review, { status: 201 });
}

import { NextResponse } from "next/server";
import { searchProducts, getRackClassifications, setRackClassification } from "../../../../../lib/seed-data";
import { classifyIsHangerShot } from "../../../../../lib/ai-rack-classify";

// Backs the homepage's ClothesRackHero (components/ClothesRackHero.tsx) -
// only a hanger/mannequin/flat-lay product photo belongs on a rack visual;
// a lifestyle photo of someone wearing it doesn't read as "hanging" no
// matter how it's styled, so this filters the newest-arrivals pool down to
// photos an AI vision call (lib/ai-rack-classify.ts) has actually confirmed
// show no person. A product's classification is cached in
// product_image_classification once computed (see getRackClassifications/
// setRackClassification) so the same photo is never re-classified; only
// genuinely new/unclassified candidates make a fresh AI call, capped per
// request so a cold cache can't turn one homepage load into a dozen
// sequential Gemini calls.
const CANDIDATE_POOL_SIZE = 24;
const MAX_NEW_CLASSIFICATIONS_PER_REQUEST = 8;
const TARGET_COUNT = 10;

// This handler takes no request params, reads no cookies/headers, so
// Next.js's App Router would otherwise treat it as fully static and cache
// its response at build time - meaning production would keep serving
// whatever the newest-arrivals/classification state happened to be at
// build, never reflecting a product published afterward. force-dynamic
// makes every request actually re-run this against the live database.
export const dynamic = "force-dynamic";

export async function GET() {
  const candidates = (await searchProducts({ sort: "newest" })).slice(0, CANDIDATE_POOL_SIZE);
  if (candidates.length === 0) return NextResponse.json([]);

  const cached = await getRackClassifications(candidates.map((p) => p.id));

  const needsClassification = candidates.filter((p) => {
    const url = p.images?.[0]?.url;
    if (!url) return false;
    const entry = cached.get(p.id);
    return !entry || entry.imageUrl !== url;
  });

  const toClassifyNow = needsClassification.slice(0, MAX_NEW_CLASSIFICATIONS_PER_REQUEST);
  await Promise.all(
    toClassifyNow.map(async (p) => {
      const url = p.images[0].url;
      const result = await classifyIsHangerShot(url);
      if (result.ok) {
        cached.set(p.id, { imageUrl: url, isHangerOrFlat: result.isHangerOrFlatShot });
        await setRackClassification(p.id, url, result.isHangerOrFlatShot);
      }
      // A classification failure (not_configured, upstream_error, etc.) just
      // leaves this product uncached - excluded from this response, tried
      // again on a later request rather than guessed at either way.
    })
  );

  const eligible = candidates.filter((p) => cached.get(p.id)?.isHangerOrFlat === true).slice(0, TARGET_COUNT);
  return NextResponse.json(eligible);
}

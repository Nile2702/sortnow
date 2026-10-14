// Free, client-side explicit-content pre-check for seller product photos -
// the last safety gate before a processed photo (background removed,
// enhanced, optionally mannequin-composited) gets uploaded to Cloudinary via
// uploadProductImage() in ProductForm.tsx / bulk-photos/page.tsx. There is
// currently zero image moderation anywhere on the platform (moderateText()
// in content-moderation.ts only ever looks at listing text), so this is the
// first and only check that actually looks at the pixels.
//
// Uses nsfwjs (https://github.com/infinitered/nsfwjs, MIT), built on
// @tensorflow/tfjs - both real npm dependencies here, unlike RMBG-1.4 in
// image-enhance.ts, which is deliberately loaded from a CDN at runtime to
// avoid installing an ML library as a project dependency at all. nsfwjs's
// own default `load()` call doesn't fetch its weights from a CDN the way
// RMBG-1.4 does, though: its default "MobileNetV2" model ships bundled
// inside the npm package itself as a set of dynamically-imported JS modules
// (confirmed by reading node_modules/nsfwjs/dist/esm/model_imports/
// mobilenet_v2.js - modelJson/weightBundles are each `() => import(...)`
// against files in the package's own dist/models directory, not a remote
// URL). Calling it through a dynamic `import("nsfwjs")` here still makes
// webpack split both the library and its model data into their own
// lazily-fetched chunk, so nothing about this check inflates the main
// bundle or runs before it's actually needed - the same "pay only when
// used" property the CDN approach gives image-enhance.ts, just satisfied by
// code-splitting instead of a network fetch.
//
// Lazy-load-once-and-cache pattern below matches getRmbgModel() in
// lib/image-enhance.ts exactly: one shared promise, reused for every photo
// checked in a page session (single-product form or a whole bulk-photos
// batch), reset on failure so a later retry can try loading again instead
// of being stuck with a permanently-rejected cached promise.
//
// Imports nsfwjs's tree-shaken "./core" entry point plus only the
// MobileNetV2 model definition, rather than the package's default entry
// point (`import "nsfwjs"`, which calls its own load() with no model
// restriction). The default entry point's default_models.js statically
// imports all three bundled models - including InceptionV3 - and
// InceptionV3's bundled weight shard files use a require() pattern Next's
// webpack build can't statically analyze ("Cannot statically analyse
// 'require(…, …)'"), which fails the production build even though nothing
// here ever uses InceptionV3. Importing only "./core" and
// "./models/mobilenet_v2" (exactly the tree-shaking approach nsfwjs's own
// README documents) keeps InceptionV3's files out of the module graph
// entirely, so webpack never has a reason to touch them.
let modelPromise: Promise<import("nsfwjs").NSFWJS> | null = null;

function getNsfwModel(): Promise<import("nsfwjs").NSFWJS> {
  if (!modelPromise) {
    modelPromise = Promise.all([import("nsfwjs/core"), import("nsfwjs/models/mobilenet_v2")])
      .then(([{ load }, { MobileNetV2Model }]) => load("MobileNetV2", { modelDefinitions: [MobileNetV2Model] }))
      .catch((err) => {
        modelPromise = null;
        throw err;
      });
  }
  return modelPromise;
}

export interface SafetyResult {
  safe: boolean;
  reason?: string;
}

// nsfwjs scores every image against five classes that don't map 1:1 onto
// "explicit vs. not": Drawing and Neutral are both safe-for-work (just
// style, not content), Hentai is explicit *drawn* content, Porn is explicit
// photographic content, and - the one that matters most for a fashion
// marketplace - Sexy is nsfwjs's own name for "suggestively dressed but not
// pornographic": bikinis, lingerie, swimwear. That's exactly the category a
// store selling swimwear/lingerie product shots legitimately lives in, so
// the block decision below is driven by Porn + Hentai alone - the two
// classes that specifically mean "explicit", never by Sexy on its own, no
// matter how high it scores. A plain product photo of a model in a bikini
// or a bra should score high on Sexy and near-zero on Porn/Hentai, and sail
// through untouched; an actual explicit photo scores high on Porn and/or
// Hentai regardless of how "Sexy" also happens to score.
//
// EXPLICIT_THRESHOLD = 0.8 (Porn + Hentai combined, out of 1.0 each):
// deliberately conservative/high rather than anywhere near 0.5. This check
// runs silently with no human review behind it on a marketplace that
// currently has *no* other image moderation at all - a false positive here
// is a seller's completely legitimate listing photo rejected with no
// visible reason, which is exactly the kind of "the AI randomly blocked me"
// experience that erodes trust in the platform fast, especially for a store
// whose catalog already includes innerwear/swimwear photography that sits
// close to nsfwjs's own Sexy/Porn decision boundary. Genuinely explicit
// content (the thing this is actually trying to catch) isn't a borderline
// case for an image classifier the way a bikini photo is - nsfwjs's own
// published eval numbers put Porn/Hentai confidence for unambiguous explicit
// images well above this line, so 0.8 still reliably catches the real
// target while leaving a wide margin for ordinary - even skimpy - fashion
// photography to pass.
const EXPLICIT_THRESHOLD = 0.8;

/**
 * Pure threshold check over nsfwjs's raw predictions - split out from
 * checkImageSafety() so the blocking logic can be unit-tested with a fake
 * prediction array, without needing a real model/image in the test
 * environment (see lib/nsfw-check.test.ts).
 */
export function evaluateNsfwPredictions(predictions: import("nsfwjs").PredictionType[]): SafetyResult {
  const probabilityOf = (className: string) => predictions.find((p) => p.className === className)?.probability ?? 0;
  const explicitScore = probabilityOf("Porn") + probabilityOf("Hentai");
  if (explicitScore >= EXPLICIT_THRESHOLD) {
    return { safe: false, reason: "This image was flagged by our automated content check." };
  }
  return { safe: true };
}

/**
 * Runs the NSFW classifier on one already-decoded image and decides whether
 * it's safe to upload. Two distinct failure modes, handled deliberately
 * differently:
 *
 *  - The model itself fails to load or run (first-use chunk fetch blocked,
 *    a browser without WebGL/WASM support TF can fall back to, an unrelated
 *    runtime error inside the library) - this is an infrastructure hiccup
 *    unrelated to the photo's actual content, so it FAILS OPEN: logs a
 *    console warning and reports the image safe, exactly like every other
 *    optional enhancement step in this codebase (stabilizeLighting,
 *    autoEnhanceQuality, ...) already does via `.catch(() => input)` - a
 *    model-loading problem must never be able to block every photo upload
 *    on the site indefinitely.
 *  - The model loads and runs fine and actually flags the image - this is a
 *    real positive result, not an error, and is never swallowed: `safe:
 *    false` is always returned to the caller, which must not upload that
 *    image.
 */
export async function checkImageSafety(imageSource: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<SafetyResult> {
  let model: import("nsfwjs").NSFWJS;
  try {
    model = await getNsfwModel();
  } catch (err) {
    console.warn("NSFW pre-check unavailable (model failed to load) - allowing upload to proceed.", err);
    return { safe: true };
  }

  let predictions: import("nsfwjs").PredictionType[];
  try {
    predictions = await model.classify(imageSource);
  } catch (err) {
    console.warn("NSFW pre-check failed to run on this image - allowing upload to proceed.", err);
    return { safe: true };
  }

  return evaluateNsfwPredictions(predictions);
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image for content check"));
    img.src = dataUrl;
  });
}

/**
 * Convenience wrapper for the two upload call sites (ProductForm.tsx,
 * bulk-photos/page.tsx), both of which carry images around as data URLs
 * rather than DOM elements - decodes the data URL into an <img> and runs
 * checkImageSafety() on it. Decode failures fail open the same way a
 * model-load failure does: a corrupt/unreadable data URL here is the same
 * class of unrelated infrastructure problem, not a content signal, and
 * whatever's actually wrong with the image will surface on its own when the
 * upload or save step itself tries to use it.
 */
export async function checkDataUrlSafety(dataUrl: string): Promise<SafetyResult> {
  let img: HTMLImageElement;
  try {
    img = await loadImageElement(dataUrl);
  } catch (err) {
    console.warn("NSFW pre-check couldn't decode this image - allowing upload to proceed.", err);
    return { safe: true };
  }
  return checkImageSafety(img);
}

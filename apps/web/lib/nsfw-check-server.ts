// Server-side counterpart to lib/nsfw-check.ts (browser-only, unchanged) -
// closes the gap where app/api/v1/seller/upload/route.ts used to accept any
// image from anyone with a valid seller session cookie, since the nsfwjs
// pre-check in nsfw-check.ts only ever ran in the browser before that
// endpoint was called (ProductForm.tsx, bulk-photos/page.tsx). A direct
// POST to the upload endpoint - curl with a stolen/valid session cookie,
// bypassing the browser entirely - skipped image moderation completely.
// This module re-runs the same nsfwjs classification inside the Node.js API
// route itself (see next.config.js's `runtime = "nodejs"` requirement -
// this can never work on the Edge runtime), using evaluateNsfwPredictions()
// from nsfw-check.ts so client and server always agree on the threshold.
//
// Deliberately NOT @tensorflow/tfjs-node. That was tried first, as the
// obviously "correct"/fastest server-side backend nsfwjs's own README
// recommends - `npm install @tensorflow/tfjs-node@4.22.0` fails to build on
// this Windows/Node 24.20.0 environment:
//
//   npm error gyp ERR! find Python - THIS VERSION OF PYTHON IS NOT SUPPORTED
//   npm error gyp ERR! stack Error: Could not find any Python installation to use
//
// tfjs-node's install script always downloads libtensorflow (the C library)
// successfully, but then always compiles its own N-API wrapper
// (tfjs_binding.node) locally via node-gyp - there's no prebuilt napi-v8
// binary for this platform/Node combination for node-pre-gyp to fetch
// instead, so it falls back to a from-source build every time. node-gyp
// needs a real Python 3.6+ on PATH to run that build; every "python"/
// "python3" on this machine's PATH resolves to a Windows Store
// app-execution-alias stub that just prints an install prompt instead of
// running, so there's no usable interpreter for node-gyp to find, and
// installing a real Python here would mean modifying this machine's
// software outside this project - out of scope for this change. This is an
// environment limitation, not a nsfwjs/tfjs-node bug.
//
// Falls back to the approach the task asked to try next: plain, pure-JS
// @tensorflow/tfjs (already a dependency - it's exactly what nsfw-check.ts
// and nsfwjs itself already import) running on its CPU backend
// (@tensorflow/tfjs-backend-cpu, also now an explicit dependency - no native
// code, nothing to compile). Slower than the native tfjs-node backend, but
// this classifies one product photo per upload request, not a hot loop, so
// the extra latency is a worthwhile trade for "actually installs and runs
// in this environment" over a build that doesn't.
//
// With no tfjs-node, there's also no `tf.node.decodeImage` to turn the
// route's base64 data URL into a tensor. Decoding is done with pure-JS,
// native-free image decoders instead (jpeg-js / pngjs) - manually building
// the RGB tf.tensor3d nsfwjs's classify() accepts (it only calls
// `tf.browser.fromPixels` - unavailable here, no DOM - when its input is
// NOT already a tf.Tensor; see node_modules/nsfwjs/dist/esm/core.js's
// `infer()`). This mirrors nsfwjs's own README exactly (its "Node JS App" /
// Express demo section manually decodes a JPEG with jpeg-js and builds a
// tf.tensor3d by hand the same way), just extended to also accept PNG,
// since this app's own resizeForUpload (ProductForm.tsx / bulk-photos/
// page.tsx) can hand the upload endpoint either format.
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
import * as jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { evaluateNsfwPredictions, type SafetyResult } from "./nsfw-check.ts";

// No WebGL/WebGPU in a Node.js API route (no DOM, no GPU context) - pin the
// backend explicitly rather than let tf try to auto-select one and fail at
// first use. Lazy-once-and-cache, same reset-on-failure pattern as the model
// promise below, so a transient failure doesn't permanently wedge every
// future request into a rejected promise.
let backendReadyPromise: Promise<void> | null = null;
function ensureCpuBackend(): Promise<void> {
  if (!backendReadyPromise) {
    backendReadyPromise = tf
      .setBackend("cpu")
      .then(() => tf.ready())
      .catch((err) => {
        backendReadyPromise = null;
        throw err;
      });
  }
  return backendReadyPromise;
}

// Same lazy-load-once-and-cache pattern as getNsfwModel() in nsfw-check.ts
// (and getRmbgModel() in image-enhance.ts) - one shared promise reused by
// every upload request this server process handles, not reloaded per
// request. The tree-shaken "./core" + "./models/mobilenet_v2" imports are
// the same ones nsfw-check.ts uses and for the same reason: the package's
// default entry point statically imports InceptionV3 too, which trips
// Next's webpack build over an unanalyzable require() inside that model's
// own bundled weight files - see nsfw-check.ts's top comment for the full
// explanation. That applies here as well, since this file is compiled
// through Next's *server* webpack bundle, not plain Node require.
let modelPromise: Promise<import("nsfwjs").NSFWJS> | null = null;
function getNsfwModelServer(): Promise<import("nsfwjs").NSFWJS> {
  if (!modelPromise) {
    modelPromise = ensureCpuBackend()
      .then(() => Promise.all([import("nsfwjs/core"), import("nsfwjs/models/mobilenet_v2")]))
      .then(([{ load }, { MobileNetV2Model }]) => load("MobileNetV2", { modelDefinitions: [MobileNetV2Model] }))
      .catch((err) => {
        modelPromise = null;
        throw err;
      });
  }
  return modelPromise;
}

// Decodes a raw image buffer into the plain RGB int32 tf.tensor3d nsfwjs's
// classify() accepts directly (no tf.browser.fromPixels / canvas / DOM
// involved at all - see the file header). Both decoders hand back
// non-premultiplied RGBA regardless of the source image's own channel count
// (pngjs always normalizes to 4 bytes/pixel; jpeg-js's `formatAsRGBA: true`
// does the same for JPEG, which has no alpha channel to begin with) - alpha
// is simply dropped below, exactly like nsfwjs's own README example does for
// its JPEG case.
function decodeImageBufferToTensor(buffer: Buffer, mimeType: string): tf.Tensor3D {
  let width: number;
  let height: number;
  let rgba: Uint8Array | Buffer;

  if (mimeType === "image/png") {
    const png = PNG.sync.read(buffer);
    width = png.width;
    height = png.height;
    rgba = png.data;
  } else {
    // Anything that isn't explicitly PNG is decoded as JPEG - the only two
    // formats resizeForUpload ever actually produces (see its `isPng`
    // branch in ProductForm.tsx / bulk-photos/page.tsx). A payload that's
    // genuinely neither throws out of jpeg.decode() and is handled by the
    // same "can't decode -> fail open" path checkDataUrlSafety() already
    // uses client-side for a corrupt image - not a content signal, and
    // Cloudinary's own upload validation catches a truly broken image
    // afterward regardless.
    const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
    width = decoded.width;
    height = decoded.height;
    rgba = decoded.data;
  }

  const numPixels = width * height;
  const rgb = new Int32Array(numPixels * 3);
  for (let i = 0; i < numPixels; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }
  return tf.tensor3d(rgb, [height, width, 3], "int32");
}

function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match ? match[1] : "application/octet-stream";
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
  return Buffer.from(base64, "base64");
}

/**
 * Server-side equivalent of checkDataUrlSafety() in nsfw-check.ts - takes
 * the same kind of `data:image/...;base64,...` string the upload route
 * already receives and decides whether it's safe to forward to Cloudinary.
 * Shares the exact same threshold logic (evaluateNsfwPredictions), so a
 * photo that would have been blocked by the browser pre-check is blocked
 * here too, and nothing that would have passed there is newly rejected.
 *
 * Same two failure modes as the client-side version, deliberately handled
 * the same way (see checkImageSafety()'s doc comment in nsfw-check.ts for
 * the full reasoning): a model-load, decode, or inference failure is an
 * infrastructure problem unrelated to the photo's content and FAILS OPEN
 * (logs a warning, reports safe) - a model/library hiccup on the server
 * must never be able to block every seller's uploads platform-wide. An
 * actual positive classification is never swallowed: `safe: false` always
 * reaches the caller, which must not upload that image.
 */
export async function checkDataUrlSafetyServer(dataUrl: string): Promise<SafetyResult> {
  let model: import("nsfwjs").NSFWJS;
  try {
    model = await getNsfwModelServer();
  } catch (err) {
    console.warn("Server-side NSFW check unavailable (model failed to load) - allowing upload to proceed.", err);
    return { safe: true };
  }

  let tensor: tf.Tensor3D;
  try {
    tensor = decodeImageBufferToTensor(bufferFromDataUrl(dataUrl), mimeTypeFromDataUrl(dataUrl));
  } catch (err) {
    console.warn("Server-side NSFW check couldn't decode this image - allowing upload to proceed.", err);
    return { safe: true };
  }

  try {
    const predictions = await model.classify(tensor);
    return evaluateNsfwPredictions(predictions);
  } catch (err) {
    console.warn("Server-side NSFW check failed to run on this image - allowing upload to proceed.", err);
    return { safe: true };
  } finally {
    tensor.dispose();
  }
}

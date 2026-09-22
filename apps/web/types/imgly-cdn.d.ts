// @imgly/background-removal is loaded at runtime from jsDelivr's ESM CDN
// (see components/ProductForm.tsx) rather than the npm package, since its
// onnxruntime-web dependency breaks Next.js 14's webpack build (the
// package's own docs say "currently only NextJS 15 is supported"). This
// ambient declaration just lets TypeScript resolve the literal URL as an
// importable module; the actual shape of what it exports is cast at the
// call site since jsDelivr's +esm bundling doesn't ship its own .d.ts.
declare module "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

// jsQR (QrScannerModal.tsx) - a small dependency-free QR decoder, loaded the
// same CDN-ESM way for the same reason: only this one modal needs it, so it
// isn't worth adding to package.json/webpack's build graph.
declare module "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm";

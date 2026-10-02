// @huggingface/transformers (lib/image-enhance.ts's removeBackgroundRMBG,
// running the RMBG-1.4 background-removal model) is loaded at runtime from
// jsDelivr's ESM CDN rather than the npm package, matching this codebase's
// convention for ML libraries only one feature needs - not worth adding to
// package.json/webpack's build graph. This ambient declaration just lets
// TypeScript resolve the literal URL as an importable module; the actual
// shape of what it exports is cast at the call site since jsDelivr's +esm
// bundling doesn't ship its own .d.ts.
declare module "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.4/+esm";

// jsQR (QrScannerModal.tsx) - a small dependency-free QR decoder, loaded the
// same CDN-ESM way for the same reason: only this one modal needs it, so it
// isn't worth adding to package.json/webpack's build graph.
declare module "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm";

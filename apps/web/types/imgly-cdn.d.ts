// @imgly/background-removal is loaded at runtime from jsDelivr's ESM CDN
// (see components/ProductForm.tsx) rather than the npm package, since its
// onnxruntime-web dependency breaks Next.js 14's webpack build (the
// package's own docs say "currently only NextJS 15 is supported"). This
// ambient declaration just lets TypeScript resolve the literal URL as an
// importable module; the actual shape of what it exports is cast at the
// call site since jsDelivr's +esm bundling doesn't ship its own .d.ts.
declare module "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // nsfwjs (lib/nsfw-check.ts) ships its bundled MobileNetV2 model weights
  // as prebuilt browserify/UMD bundles (node_modules/nsfwjs/dist/models/**).
  // Those files' own internal browserify module-loader shim contains a
  // generic `require(moduleId, true)` call (guarding a fallback path that
  // never actually runs in a browser bundle like this), which webpack's
  // static analyzer can't resolve to a real module and fails the production
  // build over ("Cannot statically analyse 'require(…, …)'") - even though
  // nothing here ever needs that fallback path at runtime. `noParse` tells
  // webpack to include these specific files as opaque, already-finished
  // bundles without trying to statically analyze what they require - exactly
  // what a prebuilt UMD bundle like this is meant to be consumed as - so the
  // build stops tripping over an internal detail of a bundle this code never
  // calls into.
  webpack(config) {
    config.module.noParse = /node_modules[\\/]nsfwjs[\\/]dist[\\/]models[\\/]/;
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.sortnow.in" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera/microphone were blocked outright here before the QR
          // scanner (getUserMedia video) and voice search (SpeechRecognition,
          // which also requests mic access under the hood) existed - that
          // made both silently fail everywhere, since the browser refuses to
          // even show a permission prompt when the site's own policy forbids
          // it. Scoped to same-origin only, same as the existing geolocation
          // rule, not opened up to third parties.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Cross-origin isolation lets the background-removal WASM model
          // use SharedArrayBuffer and run multi-threaded instead of falling
          // back to single-threaded (several times slower) - without this,
          // the browser silently ignores the model's own numThreads setting.
          // "credentialless" (rather than "require-corp") doesn't require
          // every cross-origin resource (CDN scripts, Google Fonts, product
          // images) to opt in with its own CORP header - it just strips
          // credentials from those cross-origin loads, which none of this
          // site's third-party resources need anyway.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          // Report-Only, not enforced yet - this site loads from enough
          // distinct third-party origins (Google Identity Services' sign-in
          // script/iframe, Mapbox GL JS's tile/style API, a CDN-hosted
          // WASM/ML runtime for background removal and QR scanning, plus
          // Cloudinary/Unsplash images) that shipping this enforced without
          // first watching real browser console reports for anything missed
          // risks silently breaking one of those rather than actually
          // improving security. Switch the header key to
          // "Content-Security-Policy" once a few days of real traffic (or a
          // manual click-through of sign-in, the store map, background
          // removal, and the QR scanner) turns up no unexpected violations
          // in the console. 'unsafe-inline' on style-src is required by
          // this app's own extensive use of React's style={{...}} prop
          // (renders as inline style attributes) and by Mapbox GL JS's
          // runtime-injected marker/popup styles - removing it would need a
          // broader refactor to CSS classes/nonces first, independent of
          // this header. 'unsafe-eval' on script-src is also required -
          // confirmed by actually loading /shops in report-only mode first
          // rather than guessing: Mapbox GL JS's own style-expression engine
          // evaluates strings as JS internally, and without this the policy
          // would have silently broken the store map the moment it was ever
          // switched from report-only to enforced.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://images.unsplash.com https://cdn.sortnow.in https://res.cloudinary.com",
              "font-src 'self' data:",
              "connect-src 'self' https://accounts.google.com https://api.mapbox.com https://events.mapbox.com https://cdn.jsdelivr.net https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co",
              "worker-src 'self' blob:",
              "frame-src https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

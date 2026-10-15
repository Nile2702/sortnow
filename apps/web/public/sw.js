// Exists purely to satisfy Chrome's PWA installability check - a service
// worker with a fetch handler is required before "Add to Home Screen"
// creates a real installed PWA (honoring app/manifest.ts's icons, including
// the maskable one) instead of falling back to a plain bookmark shortcut
// with its own default icon treatment.
//
// Every handler below is a pure passthrough to the network. This is a live
// marketplace with constantly changing stock, prices, and reservations -
// caching any response here would risk showing a shopper stale stock or an
// old price days after it changed. Nothing is cached and no request is
// intercepted differently than an ordinary network request would already
// behave; this file deliberately does nothing beyond making the browser
// consider the site installable.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

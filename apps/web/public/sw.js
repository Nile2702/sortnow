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
  // GET-only. Re-dispatching a request through fetch(event.request) inside
  // a service worker is unreliable once that request carries a body - a
  // product photo upload POSTs a multi-MB base64 image as its JSON body,
  // and WebKit (Safari/iOS) in particular fails that exact case with
  // "FetchEvent.respondWith received an error: TypeError: Load failed".
  // Not calling respondWith at all lets the browser handle a non-GET
  // request as a completely ordinary, un-intercepted request - this file's
  // only job is satisfying the "has a fetch handler" installability check
  // (see the top of this file), not actually intercepting every request.
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});

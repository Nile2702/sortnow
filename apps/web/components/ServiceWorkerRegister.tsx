"use client";

import { useEffect } from "react";

// Registers public/sw.js - see that file's own comment for why it exists
// (purely to satisfy Chrome's PWA installability check, with zero caching
// behavior) and app/manifest.ts's comment for what it fixes (the home-
// screen icon falling back to a plain white square without it). Mounted
// once in the root layout, same pattern as ScrollToTop/CursorGlow.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

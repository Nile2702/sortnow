"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOrCreateVisitorId } from "../lib/visitor-id";
import { getStoredLocationPref } from "../lib/location";

// Site-wide visit log, mounted once in the root layout (see layout.tsx) -
// distinct from TrackPageView, which only fires on storefront pages and
// tags QR placements for a seller's own footfall analytics. This backs the
// admin-only "who's visiting the site" view (app/admin/visitors) and fires
// on every route, not just /store/[slug]. Anonymous: see lib/visitor-id.ts
// for what visitorId is (and isn't).
export function VisitorTracking() {
  const pathname = usePathname();

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    // The visitor's own self-reported area, if they've actually set one
    // (getStoredLocationPref, not getLocationPref's always-on display
    // default) - never derived from their IP address. A visitor who hasn't
    // touched the location picker yet just logs with no location, rather
    // than a guessed one.
    const locationLabel = getStoredLocationPref()?.label;
    fetch("/api/v1/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, path: pathname, referrer: document.referrer || undefined, locationLabel }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}

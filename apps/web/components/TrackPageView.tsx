"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Fires once per storefront page load, tagging QR-sourced visits with their
// placement (?src=qr&pos=Shop+Window) for footfall attribution - see
// store_analytics_events in database/schema.sql and the Seller Portal's
// Analytics tab.
export function TrackPageView({ storeSlug }: { storeSlug: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const qrPosition = searchParams.get("src") === "qr" ? searchParams.get("pos") ?? "Unknown" : undefined;
    fetch("/api/v1/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug, qrPosition }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  return null;
}

"use client";

import { useRouter } from "next/navigation";

// Sends the shopper to /shops in Map view, scoped to only the stores behind
// whatever product list is currently on screen (search results, a category
// listing) - same "explore on map" pattern as a travel-booking site's hotel
// list, but scoped to the stores that actually matched instead of every
// store on the platform.
export function ExploreOnMapButton({ products }: { products: { storeSlug: string }[] }) {
  const router = useRouter();
  if (products.length === 0) return null;
  const slugs = Array.from(new Set(products.map((p) => p.storeSlug)));

  return (
    <button
      type="button"
      onClick={() => router.push(`/shops?view=map&stores=${slugs.map(encodeURIComponent).join(",")}`)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: 999,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1e40af",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      🗺 Explore on Map
    </button>
  );
}

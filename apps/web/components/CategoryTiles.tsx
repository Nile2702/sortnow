"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TiltCard } from "./TiltCard";
import { hashHue } from "../lib/string-hue";

interface SubTile {
  label: string;
  gender: string;
  subCategory: string;
  count: number;
  imageUrl?: string;
}

// A color per subcategory, the same way store avatars get one (see
// page.tsx) - derived from the label's own characters, so it's stable
// across reloads. Used only as a fallback background for a tile with
// neither a curated photo below nor a live product photo from the API.
function tileColor(label: string) {
  return `hsl(${hashHue(label)}, 45%, 28%)`;
}

// Curated stock photography, one per tile, supplied directly by the user -
// takes priority over the live-product-photo fallback below (originally
// built so a tile's photo always matched real current inventory) because
// these were chosen deliberately for a specific look, not because a photo
// was missing. Keyed by the tile's own label (CATEGORY_TILES in
// lib/seed-data.ts) rather than gender/subCategory, since that's the
// stable, human-chosen identifier here.
const CURATED_IMAGES: Record<string, string> = {
  Sarees: "/categories/sarees.jpg",
  Kurtis: "/categories/kurtis.webp",
  Jeans: "/categories/jeans.jpg",
  "Kids Wear": "/categories/kids-wear.jpg",
};

// Large photo-card grid - restyled from the previous small letter-avatar
// row to match a reference the user shared (a DTC site's "shop by goal"
// section: big full-bleed photo cards, a bold label in the corner, a
// circular arrow button). A tile not covered by CURATED_IMAGES above still
// falls back to a real, currently-live product photo for that category
// (see getCategoryTileCounts) rather than a generic placeholder.
export function CategoryTiles() {
  const [subTiles, setSubTiles] = useState<SubTile[]>([]);

  useEffect(() => {
    fetch("/api/v1/category-tiles")
      .then((r) => r.json())
      .then(setSubTiles);
  }, []);

  if (!subTiles.length) return null;

  return (
    <section style={{ marginBottom: 48 }}>
      <h2
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          marginBottom: 20,
          fontFamily: "var(--site-font-heading)",
        }}
      >
        Shop every{" "}
        <em style={{ fontFamily: "var(--site-font-accent)", fontStyle: "italic", fontWeight: 600, color: "var(--sio-bronze)" }}>style</em>.
      </h2>
      <div
        className="sio-category-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
      >
        {subTiles.map((tile, i) => {
          const href = tile.subCategory
            ? `/category/${tile.gender}?subCategory=${encodeURIComponent(tile.subCategory)}`
            : `/category/${tile.gender}`;
          const imageUrl = CURATED_IMAGES[tile.label] ?? tile.imageUrl;
          return (
            <div key={`${tile.gender}-${tile.subCategory}`} className="sio-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <TiltCard>
                <Link
                  href={href}
                  className="sio-card"
                  style={{
                    position: "relative",
                    display: "block",
                    aspectRatio: "3 / 4",
                    borderRadius: 16,
                    overflow: "hidden",
                    textDecoration: "none",
                    background: tileColor(tile.label),
                  }}
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      aria-hidden
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {/* Lightens the upper portion only, where the label/count
                      sit - this used to darken the *lower* portion instead
                      (a 0deg gradient's 0% stop lands at the bottom, not
                      top), which never actually touched the text's own
                      corner at all; black text on a bright/busy photo (the
                      Kurtis card's cream wall, for one) was reported
                      unreadable as a direct result. A light wash behind
                      black text works the same way the dark wash behind
                      white text did for the arrow button below - a backing
                      that reads well regardless of the photo underneath it. */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.1) 45%, transparent 70%)",
                    }}
                  />
                  <div style={{ position: "absolute", top: 16, left: 16, right: 16, color: "var(--sio-ink)" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--site-font-heading)" }}>{tile.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>{tile.count} items</div>
                  </div>
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      bottom: 14,
                      left: 14,
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.92)",
                      color: "var(--sio-ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    →
                  </span>
                </Link>
              </TiltCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}

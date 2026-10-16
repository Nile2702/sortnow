"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TiltCard } from "./TiltCard";

interface SubTile {
  label: string;
  gender: string;
  subCategory: string;
  count: number;
  imageUrl?: string;
}

// A color per subcategory, the same way store avatars get one (see
// page.tsx) - derived from the label's own characters, so it's stable
// across reloads. Used only as a fallback background for a tile whose
// category has no live product (and therefore no real photo) yet.
function tileColor(label: string) {
  const hue = (label.charCodeAt(0) * 37 + (label.charCodeAt(1) ?? 0) * 11) % 360;
  return `hsl(${hue}, 45%, 28%)`;
}

// Large photo-card grid - restyled from the previous small letter-avatar
// row to match a reference the user shared (a DTC site's "shop by goal"
// section: big full-bleed photo cards, a bold label in the corner, a
// circular arrow button). Each card's background is a real, currently-live
// product photo for that category (see getCategoryTileCounts), not stock
// photography, so it stays honest about what's actually in stock right now
// instead of a generic category image that might not reflect real
// inventory.
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
                    borderRadius: 20,
                    overflow: "hidden",
                    textDecoration: "none",
                    background: tileColor(tile.label),
                  }}
                >
                  {tile.imageUrl && (
                    <img
                      src={tile.imageUrl}
                      alt=""
                      aria-hidden
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {/* Darkens the lower portion only, enough for the white
                      label/count to stay readable against any photo without
                      flattening the whole card to a dim overlay the way the
                      hero slider's full-card darken does. */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.05) 45%, transparent 70%)",
                    }}
                  />
                  <div style={{ position: "absolute", top: 16, left: 16, right: 16, color: "#fff" }}>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TiltCard } from "./TiltCard";

interface SubTile {
  label: string;
  gender: string;
  subCategory: string;
  count: number;
}

// Photo-style tiles by gender instead of one-per-subcategory - a shopper
// thinks "Men/Women/Kids" first and refines from there (same top-level
// split as the header nav), and a full-bleed gradient "photo" card reads as
// an actual lookbook image rather than the small letter-avatar circle this
// replaced, without needing real product photography assets.
const GENDER_TILES: { gender: string; label: string; bg: string }[] = [
  { gender: "women", label: "Women", bg: "linear-gradient(160deg, #7a1f3d 0%, #d9a441 100%)" },
  { gender: "men", label: "Men", bg: "linear-gradient(160deg, #1e3a8a 0%, #64748b 100%)" },
  { gender: "kids", label: "Kids", bg: "linear-gradient(160deg, #166534 0%, #eab308 100%)" },
];

export function CategoryTiles() {
  const [subTiles, setSubTiles] = useState<SubTile[]>([]);

  useEffect(() => {
    fetch("/api/v1/category-tiles")
      .then((r) => r.json())
      .then(setSubTiles);
  }, []);

  if (!subTiles.length) return null;

  // Every displayed subcategory tile for a gender covers a disjoint slice
  // of that gender's catalog, so summing their counts is a fair "items
  // available" figure for the gender tile without a separate API call.
  const countFor = (gender: string) => subTiles.filter((t) => t.gender === gender).reduce((sum, t) => sum + t.count, 0);

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--sio-line)", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Shop by Category</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        {GENDER_TILES.map((tile, i) => (
          <div key={tile.gender} className="sio-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <TiltCard>
              <Link
                href={`/category/${tile.gender}`}
                className="sio-card"
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  aspectRatio: "3 / 4",
                  borderRadius: 16,
                  padding: "16px 12px",
                  background: tile.bg,
                  textDecoration: "none",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 55%)" }}
                />
                <div style={{ position: "relative", fontFamily: "var(--site-font-heading)", fontWeight: 700, fontSize: 16, color: "#fff" }}>
                  {tile.label}
                </div>
                <div style={{ position: "relative", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>{countFor(tile.gender)} items</div>
              </Link>
            </TiltCard>
          </div>
        ))}
      </div>
    </section>
  );
}

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

// A color per subcategory, the same way store avatars get one (see
// page.tsx) - derived from the label's own characters, so it's stable
// across reloads without needing to hand-pick a color per subcategory or
// have real product photography for each tile.
function tileColor(label: string) {
  const hue = (label.charCodeAt(0) * 37 + (label.charCodeAt(1) ?? 0) * 11) % 360;
  return {
    bg: `hsl(${hue}, 55%, 93%)`,
    fg: `hsl(${hue}, 45%, 32%)`,
  };
}

// Subcategory-level tiles (Sarees, Kurtis, Jeans, ...) instead of just the
// three Women/Men/Kids blocks - more, smaller entry points a shopper can
// scan and tap straight into, the way most fashion apps do their "shop by
// category" row, without needing real photography assets per subcategory.
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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--sio-line)", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Shop by Category</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 14 }}>
        {subTiles.map((tile, i) => {
          const { bg, fg } = tileColor(tile.label);
          const href = tile.subCategory
            ? `/category/${tile.gender}?subCategory=${encodeURIComponent(tile.subCategory)}`
            : `/category/${tile.gender}`;
          return (
            <div key={`${tile.gender}-${tile.subCategory}`} className="sio-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <TiltCard>
                <Link
                  href={href}
                  className="sio-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 16,
                      background: bg,
                      color: fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--site-font-heading)",
                      fontWeight: 700,
                      fontSize: 22,
                    }}
                  >
                    {tile.label.charAt(0)}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111" }}>{tile.label}</div>
                    <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{tile.count} items</div>
                  </div>
                </Link>
              </TiltCard>
            </div>
          );
        })}
      </div>
    </section>
  );
}

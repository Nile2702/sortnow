"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TiltCard } from "./TiltCard";

interface Tile {
  label: string;
  gender: string;
  subCategory: string;
  count: number;
}

export function CategoryTiles() {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    fetch("/api/v1/category-tiles")
      .then((r) => r.json())
      .then(setTiles);
  }, []);

  if (!tiles.length) return null;

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--sio-line)", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Shop by Category</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        {tiles.map((tile, i) => (
          <div key={tile.label} className="sio-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <TiltCard>
            <Link
              href={`/category/${tile.gender}${tile.subCategory ? `?subCategory=${encodeURIComponent(tile.subCategory)}` : ""}`}
              className="sio-card"
              style={{
                display: "block",
                background: "var(--sio-paper)",
                border: "1px solid var(--sio-line)",
                borderRadius: 16,
                padding: 24,
                textDecoration: "none",
              }}
            >
              <div
                className="sio-glow-ring"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "1px solid var(--sio-bronze)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontFamily: "var(--site-font-heading)",
                  color: "var(--sio-bronze)",
                  marginBottom: 18,
                }}
              >
                {tile.label.charAt(0)}
              </div>
              <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 600, fontSize: 19, color: "var(--sio-ink)", marginBottom: 4 }}>
                {tile.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 14 }}>{tile.count} items available</div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sio-bronze-dark)", display: "flex", alignItems: "center", gap: 6 }}>
                Browse Collection <span>→</span>
              </div>
            </Link>
          </TiltCard>
          </div>
        ))}
      </div>
    </section>
  );
}

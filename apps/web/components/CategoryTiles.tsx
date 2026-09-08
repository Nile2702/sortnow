"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tile {
  label: string;
  gender: string;
  subCategory: string;
  icon: string;
  bg: string;
  fg: string;
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
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {tiles.map((tile, i) => (
          <Link
            key={tile.label}
            href={`/category/${tile.gender}${tile.subCategory ? `?subCategory=${encodeURIComponent(tile.subCategory)}` : ""}`}
            className="sio-card sio-fade-in"
            style={{
              display: "block",
              background: tile.bg,
              borderRadius: 16,
              padding: 20,
              textDecoration: "none",
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(255,255,255,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 14,
              }}
            >
              {tile.icon}
            </div>
            <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 700, fontSize: 17, color: tile.fg, marginBottom: 4 }}>
              {tile.label}
            </div>
            <div style={{ fontSize: 12, color: tile.fg, opacity: 0.75, marginBottom: 10 }}>{tile.count} items live</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tile.fg, display: "flex", alignItems: "center", gap: 4 }}>
              Browse Collection <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

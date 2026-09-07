"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Slide {
  storeSlug: string;
  title: string;
  subtitle: string;
  cta: string;
  bg: string;
  fg: string;
}

const SLIDES: Slide[] = [
  {
    storeSlug: "urban-vogue",
    title: "Flat 40% Off — Festive Ethnic",
    subtitle: "Urban Vogue, Bandra · Live sale ends tonight",
    cta: "Shop Urban Vogue",
    bg: "linear-gradient(135deg, #7c2d12, #d97706)",
    fg: "#fff7ed",
  },
  {
    storeSlug: "south-silk-house",
    title: "Signature Kanjivaram Silks",
    subtitle: "South Silk House, T. Nagar · New arrivals",
    cta: "Explore Silk Sarees",
    bg: "linear-gradient(135deg, #7a1f3d, #c98a2c)",
    fg: "#fff8f0",
  },
  {
    storeSlug: "denim-district",
    title: "Weekend Denim Sale — 25% Off",
    subtitle: "Denim District, Commercial Street",
    cta: "Shop New Denim",
    bg: "linear-gradient(135deg, #1e3a8a, #2563eb)",
    fg: "#eff6ff",
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 24,
        height: 260,
      }}
    >
      <Link
        key={slide.storeSlug + index}
        href={`/store/${slide.storeSlug}`}
        className="sio-slide-in"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
          padding: "0 48px",
          background: slide.bg,
          color: slide.fg,
          textDecoration: "none",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8, letterSpacing: 0.5 }}>{slide.subtitle}</div>
        <h2 style={{ fontSize: 32, margin: 0, marginBottom: 16, maxWidth: 520 }}>{slide.title}</h2>
        <span
          style={{
            alignSelf: "flex-start",
            padding: "10px 20px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.5)",
            fontSize: 14,
          }}
        >
          {slide.cta} →
        </span>
      </Link>

      <div style={{ position: "absolute", bottom: 16, right: 24, display: "flex", gap: 8 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 999,
              border: "none",
              background: i === index ? "#fff" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "width 0.3s ease",
            }}
          />
        ))}
      </div>

      <button
        onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        aria-label="Previous slide"
        style={arrowStyle("left")}
      >
        ‹
      </button>
      <button onClick={() => setIndex((i) => (i + 1) % SLIDES.length)} aria-label="Next slide" style={arrowStyle("right")}>
        ›
      </button>
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 12,
    transform: "translateY(-50%)",
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    lineHeight: 1,
  };
}

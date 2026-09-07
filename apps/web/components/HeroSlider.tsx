"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Slide {
  href: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  bg: string;
}

const SLIDES: Slide[] = [
  {
    href: "/",
    eyebrow: "SORT IT OUT",
    title: "Curated Styles, Just For You",
    subtitle: "Our fashion experts hand-pick every item to ensure quality and style.",
    cta: "Explore All Shops",
    bg: "linear-gradient(140deg, #1c1917 0%, #3f2d1f 55%, #1c1917 100%)",
  },
  {
    href: "/",
    eyebrow: "HYPERLOCAL DISCOVERY",
    title: "Local Flair, Global Style",
    subtitle: "Find the best boutiques in your city. We bring them to your fingertips.",
    cta: "Explore All Shops",
    bg: "linear-gradient(140deg, #1e1b2e 0%, #3b2645 55%, #1e1b2e 100%)",
  },
  {
    href: "/store/urban-vogue",
    eyebrow: "LIVE NOW · URBAN VOGUE",
    title: "Flat 40% Off — Festive Ethnic",
    subtitle: "Handpicked festive wear from Bandra's favourite ethnic boutique.",
    cta: "Shop Urban Vogue",
    bg: "linear-gradient(140deg, #2a1409 0%, #7c2d12 55%, #2a1409 100%)",
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 32,
        height: 380,
        boxShadow: "0 20px 40px rgba(15,23,42,0.18)",
      }}
    >
      <Link
        key={slide.href + index}
        href={slide.href}
        className="sio-slide-in"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
          padding: "0 32px",
          background: slide.bg,
          color: "#fff",
          textDecoration: "none",
        }}
      >
        {/* Subtle vignette + spotlight to read as a photographic backdrop rather than a flat gradient */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55), transparent 60%)",
          }}
        />

        <div
          style={{
            position: "relative",
            fontSize: 12,
            letterSpacing: 2,
            fontWeight: 700,
            opacity: 0.75,
            marginBottom: 14,
            textTransform: "uppercase",
          }}
        >
          {slide.eyebrow}
        </div>
        <h1
          style={{
            position: "relative",
            fontSize: 44,
            margin: 0,
            marginBottom: 14,
            maxWidth: 640,
            fontFamily: "var(--site-font-heading)",
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {slide.title}
        </h1>
        <p style={{ position: "relative", fontSize: 15, opacity: 0.85, marginBottom: 26, maxWidth: 460 }}>{slide.subtitle}</p>
        <span
          style={{
            position: "relative",
            padding: "13px 30px",
            borderRadius: 999,
            background: "#ec4899",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 8px 20px rgba(236,72,153,0.45)",
          }}
        >
          {slide.cta}
        </span>
      </Link>

      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 24 : 8,
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
    [side]: 16,
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
    lineHeight: 1,
  };
}

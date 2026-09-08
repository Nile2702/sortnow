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
    href: "/shops",
    eyebrow: "SORT IT OUT",
    title: "Curated Styles, Just For You",
    subtitle: "Our fashion experts hand-pick every item to ensure quality and style.",
    cta: "Explore All Shops",
    bg: "linear-gradient(140deg, #1c1917 0%, #3f2d1f 55%, #1c1917 100%)",
  },
  {
    href: "/shops",
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
        overflow: "hidden",
        marginBottom: 40,
        height: 400,
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
            fontSize: 11,
            letterSpacing: "0.22em",
            fontWeight: 500,
            opacity: 0.8,
            marginBottom: 18,
            textTransform: "uppercase",
          }}
        >
          {slide.eyebrow}
        </div>
        <h1
          style={{
            position: "relative",
            fontSize: 48,
            margin: 0,
            marginBottom: 18,
            maxWidth: 640,
            fontFamily: "var(--site-font-heading)",
            fontWeight: 600,
            lineHeight: 1.15,
          }}
        >
          {slide.title}
        </h1>
        <p style={{ position: "relative", fontSize: 15, opacity: 0.8, marginBottom: 30, maxWidth: 440, fontWeight: 300 }}>{slide.subtitle}</p>
        <span
          className="sio-hero-cta"
          style={{
            position: "relative",
            padding: "14px 34px",
            border: "1px solid rgba(255,255,255,0.55)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
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

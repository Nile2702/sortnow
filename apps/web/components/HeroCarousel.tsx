"use client";

import { useState } from "react";

interface Slide {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
}

// Same structure and visual language as the homepage HeroSlider - a store's
// theme only tints the gradient with its own primary color, so every
// storefront reads as part of one site instead of a different one. No CTA
// button here (unlike the homepage slider) - a shopper viewing a store's own
// page is already there, so a "Shop X" button pointing at the same page
// would be redundant; the category nav and product grid right below serve
// that purpose instead.
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  if (!slides?.length) return null;
  const slide = slides[active];

  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 340 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(140deg, #16161a 0%, var(--store-primary, #1f2937) 55%, #16161a 100%)",
        }}
      />
      {slide.image && (
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, backgroundImage: `url(${slide.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}
      {slide.image && <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(8,10,16,0.55)" }} />}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
          padding: "0 32px",
          color: "#fff",
        }}
      >
        {slide.eyebrow && (
          <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 700, opacity: 0.75, marginBottom: 12, textTransform: "uppercase" }}>
            {slide.eyebrow}
          </div>
        )}
        <h1
          className="sio-hero-title"
          style={{
            fontSize: 38,
            margin: 0,
            marginBottom: 12,
            maxWidth: 600,
            fontFamily: "var(--site-font-heading)",
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {slide.title}
        </h1>
        {slide.subtitle && <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 440 }}>{slide.subtitle}</p>}
      </div>

      {slides.length > 1 && (
        <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === active ? 22 : 8,
                height: 8,
                borderRadius: 999,
                border: "none",
                background: i === active ? "#fff" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                transition: "width 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

interface Slide {
  imageUrl: string;
  altText?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

// Shared across every tenant - only the `slides` data (from theme.config) differs.
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  if (!slides?.length) return null;
  const slide = slides[active];

  return (
    <div style={{ position: "relative", borderRadius: "var(--sio-radius)", overflow: "hidden" }}>
      <img src={slide.imageUrl} alt={slide.altText ?? ""} style={{ width: "100%", display: "block" }} loading="eager" />
      {slide.ctaLabel && (
        <a
          href={slide.ctaLink ?? "#"}
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            background: "var(--sio-color-primary)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "var(--sio-radius)",
            fontFamily: "var(--sio-font-heading)",
            textDecoration: "none",
          }}
        >
          {slide.ctaLabel}
        </a>
      )}
      {slides.length > 1 && (
        <div style={{ position: "absolute", bottom: 12, right: 16, display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "none",
                background: i === active ? "var(--sio-color-accent)" : "rgba(255,255,255,0.6)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

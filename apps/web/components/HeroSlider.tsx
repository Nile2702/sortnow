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
  image?: string;
}

const SLIDES: Slide[] = [
  {
    href: "/shops",
    eyebrow: "SORT NOW",
    title: "Curated Styles, Just For You",
    subtitle: "Our fashion experts hand-pick every item to ensure quality and style.",
    cta: "Explore All Shops",
    bg: "linear-gradient(140deg, #16161a 0%, #5c1a14 55%, #16161a 100%)",
    image: "/hero/boutique-rack.jpg",
  },
  {
    href: "/shops",
    eyebrow: "HYPERLOCAL DISCOVERY",
    title: "Local Flair, Global Style",
    subtitle: "Find the best boutiques in your city. We bring them to your fingertips.",
    cta: "Explore All Shops",
    bg: "linear-gradient(140deg, #1e1b2e 0%, #3b2645 55%, #1e1b2e 100%)",
    image: "/hero/store-interior.jpg",
  },
  {
    // No specific discount/"live now" claim here - unlike the homepage's own
    // "Live Sales Near You" section, this slider is static evergreen
    // marketing copy, not driven by a store's real liveSale data, so it
    // must never promise a specific, time-bound offer that may not
    // actually be running.
    href: "/store/urban-vogue",
    eyebrow: "FEATURED STORE",
    title: "Urban Vogue — Festive Ethnic",
    subtitle: "Handpicked festive wear from Bandra's favourite ethnic boutique.",
    cta: "Shop Urban Vogue",
    bg: "linear-gradient(140deg, #180e0e 0%, #841f17 55%, #180e0e 100%)",
    image: "/hero/urban-vogue.avif",
  },
  {
    href: "/store/sole-street",
    eyebrow: "NEW CITY · SOLE STREET, PUNE",
    title: "Sneakers & Streetwear, Sorted",
    subtitle: "Fresh drops for campus life, now shoppable near FC Road.",
    cta: "Shop Sole Street",
    bg: "linear-gradient(140deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)",
    image: "/hero/sneakers.webp",
  },
];

const PARTICLE_SPECS = [
  { size: 5, left: "12%", top: "22%", delay: "0s", duration: "6.5s" },
  { size: 3, left: "78%", top: "18%", delay: "1.2s", duration: "8s" },
  { size: 4, left: "88%", top: "62%", delay: "0.6s", duration: "7.2s" },
  { size: 3, left: "20%", top: "72%", delay: "2s", duration: "9s" },
  { size: 6, left: "55%", top: "12%", delay: "0.4s", duration: "6s" },
  { size: 3, left: "40%", top: "80%", delay: "1.6s", duration: "7.8s" },
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
  // Every slide's headline gets its own last word dropped into the italic
  // serif accent (see the <em> below) - computed here rather than
  // hand-splitting each title string in SLIDES, so any future slide gets
  // the same treatment automatically.
  const titleWords = slide.title.split(" ");
  const titleLastWord = titleWords[titleWords.length - 1];
  const titleRest = titleWords.slice(0, -1).join(" ");

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: 40,
        height: 400,
        borderRadius: 24,
      }}
    >
      <div
        key={slide.href + index}
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
        }}
      >
        {slide.image && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        {/* Darkens a real photo enough for white text to stay readable, same
            job the plain radial gradient below does for a flat color slide -
            stacked together when both are present. */}
        {slide.image && (
          <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(8,10,16,0.55)" }} />
        )}
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
        <div className="sio-grid-overlay" aria-hidden />
        <div className="sio-scanline" aria-hidden />
        {PARTICLE_SPECS.map((p, i) => (
          <span
            key={i}
            className="sio-particle"
            aria-hidden
            style={{ width: p.size, height: p.size, left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}

        {/* Headline block is its own link (the slide's actual destination) -
            kept separate from the two CTA buttons below so neither button
            ends up nested inside it (two overlapping <a> targets on the
            same slide is invalid HTML and browsers handle it inconsistently). */}
        <Link href={slide.href} style={{ position: "relative", textDecoration: "none", color: "inherit" }}>
          <div
            className="sio-neon-text"
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              fontWeight: 700,
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            {slide.eyebrow}
          </div>
          {/* Bold sans headline with its own last word dropped into an
              italic serif (--site-font-accent, Playfair Display) - the
              mixed-typography accent treatment referenced from Huel's own
              homepage, applied consistently across every slide by always
              italicizing the final word rather than hand-picking one per
              slide. Conveniently, the fourth slide's own last word
              ("Sorted") lands right on the brand name itself. */}
          <h1
            className="sio-hero-title"
            style={{
              fontSize: 56,
              margin: 0,
              marginBottom: 18,
              maxWidth: 640,
              fontFamily: "var(--site-font-heading)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
            }}
          >
            {titleRest} <em style={{ fontFamily: "var(--site-font-accent)", fontStyle: "italic", fontWeight: 600 }}>{titleLastWord}</em>
          </h1>
          <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 30, maxWidth: 440, fontWeight: 300 }}>{slide.subtitle}</p>
        </Link>
        <div style={{ position: "relative", display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link
            href={slide.href}
            style={{
              padding: "14px 34px",
              border: "none",
              background: "var(--sio-bronze)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {slide.cta} →
          </Link>
          {/* Second, outlined action alongside the slide's own primary CTA -
              the two-button row (one filled, one outlined) is the other
              half of the referenced look. Shared across every slide rather
              than a bespoke secondary action per slide, the same way the
              reference site repeats "Shop Bestsellers" under every hero
              variant rather than writing a new one each time. */}
          <Link
            href="/discover"
            style={{
              padding: "14px 34px",
              border: "1.5px solid rgba(255,255,255,0.7)",
              background: "transparent",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Browse Nearby
          </Link>
        </div>
      </div>

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

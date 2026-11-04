"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface RackProduct {
  id: string;
  title: string;
  basePrice: number;
  images: { url: string }[];
  storeName?: string;
}

// A real clothing rack rendered in CSS: a rail, each product hung from it by
// a small ring + thread, swaying gently and unevenly like garments actually
// do on a shop floor - the "immersive" hero format referenced from an
// Instagram reel (an agency's own site, @w.wearebrand).
//
// Deliberately NOT a product card: no box, no border, no price, no title -
// just the garment photo itself, given a real CSS 3D tilt (perspective +
// rotateY) so it reads as viewed from an angle, like walking past the rack.
// This only works because every photo shown here has already been AI-
// classified (see app/api/v1/products/rack/route.ts) as a real hanger/
// mannequin/flat-lay shot on a plain studio background - with no bounding
// box drawn around it and the section's own background matched to that same
// white, the photo's own backdrop disappears into the page, reading as a
// floating cutout without any actual background-removal processing (the
// client-side tool for that, lib/image-enhance.ts, exists but is a ~45MB
// model - far too heavy to run in every visitor's browser just for a
// decorative homepage section). object-fit: contain (not cover) keeps the
// whole garment and its hanger in frame rather than cropping into a fixed
// box, which matters more here now that there's no caption to fall back on
// for context.
//
// Clicking (or hovering, on a device with a pointer) turns an item to face
// the viewer dead-on - like pulling it forward off the rack - with
// navigation held just long enough (see FLIP_MS) for that turn to read as a
// deliberate action, not a layout jump.
const TILT_DEG = 52;
const PERSPECTIVE_PX = 480;
const FLIP_MS = 260;

export function ClothesRackHero({ products }: { products: RackProduct[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const items = products.slice(0, 10);
  if (items.length === 0) return null;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    // A modified click (middle-click, ctrl/cmd+click, shift+click) means the
    // shopper wants a new tab/window - let the browser's own default <a>
    // behavior handle that normally rather than hijacking it for the flip
    // animation, which only makes sense for an in-place navigation.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setActiveId(id);
    setTimeout(() => router.push(`/product/${id}`), FLIP_MS);
  }

  return (
    <section
      className="sio-fade-in"
      style={{
        marginBottom: 40,
        padding: "28px 0 16px",
        background: "#fff",
        borderRadius: 16,
      }}
    >
      <div style={{ padding: "0 20px", marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--sio-muted)", marginBottom: 4 }}>
          Fresh off the rail
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Straight from the store, onto the rack</h2>
      </div>

      {/* The rail itself - a simple rounded bar with two end caps, sitting
          above the row of hung items. position: relative so each hanger's
          ring can sit flush against its underside (top: -5px, below). */}
      <div style={{ position: "relative", margin: "0 20px 0", height: 8 }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "0 6px",
            borderRadius: 999,
            background: "linear-gradient(180deg, #bfc3cc 0%, #8a8f99 45%, #6b6f78 100%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.18)",
          }}
        />
        <div aria-hidden style={{ position: "absolute", left: 0, top: -1, width: 10, height: 10, borderRadius: "50%", background: "#6b6f78" }} />
        <div aria-hidden style={{ position: "absolute", right: 0, top: -1, width: 10, height: 10, borderRadius: "50%", background: "#6b6f78" }} />
      </div>

      {/* perspective on the row, not per-item, so every tilted item shares
          one consistent vanishing point - the same reason a real rack of
          angled garments all seem to converge toward one spot when you look
          down it. */}
      <div className="sio-scroll-row" style={{ padding: "0 20px", alignItems: "flex-start", perspective: PERSPECTIVE_PX }}>
        {items.map((p, i) => {
          const active = activeId === p.id;
          return (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              onClick={(e) => handleClick(e, p.id)}
              aria-label={p.title}
              className="sio-rack-item"
              style={{
                flex: "0 0 168px",
                minWidth: 168,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transformOrigin: "top center",
                animationName: "sio-rack-sway",
                animationDuration: `${3.2 + (i % 3) * 0.4}s`,
                animationDelay: `${(i % 4) * 0.3}s`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }}
            >
              {/* Ring threaded onto the rail, plus a short thread down to the
                  photo - the "hanging" cue, kept deliberately simple (no
                  literal hanger icon) so it reads clearly even at this small
                  size. */}
              <div
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "2px solid var(--sio-ink-soft)",
                  background: "#fff",
                  marginTop: -1,
                }}
              />
              <div aria-hidden style={{ width: 2, height: 16, background: "var(--sio-line)" }} />

              <img
                src={p.images?.[0]?.url}
                alt={p.title}
                loading="lazy"
                className="sio-rack-card"
                style={{
                  width: "100%",
                  height: 240,
                  objectFit: "contain",
                  display: "block",
                  transform: `rotateY(${active ? 0 : TILT_DEG}deg)`,
                  transition: `transform ${FLIP_MS}ms ease`,
                }}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

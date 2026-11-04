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
// Instagram reel (an agency's own site, @w.wearebrand), rebuilt here with
// SORT NOW's own real product photos instead of flat garment cutouts, since
// that's what the catalog actually has.
//
// Since these are full lifestyle/model photos (not isolated garment
// cutouts), a flat rectangular thumbnail never reads as "hanging on a rack"
// the way a cleanly cut-out garment does - so each card is given a real CSS
// 3D tilt (perspective + rotateY) instead, as if you're walking past the
// rack and seeing it at an angle. Clicking (or hovering, on a device with a
// pointer) turns that item to face the viewer dead-on - like pulling one
// item forward off the rack to actually look at it - with navigation to the
// product page held just long enough (see FLIP_MS) for that turn to read as
// a deliberate action, not a layout jump.
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
        padding: "28px 0 8px",
        background: "linear-gradient(180deg, var(--sio-cream) 0%, rgba(245,245,246,0) 100%)",
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

      {/* perspective on the row, not per-item, so every tilted card shares
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
              className="sio-rack-item"
              style={{
                flex: "0 0 148px",
                minWidth: 148,
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
                  card - the "hanging" cue, kept deliberately simple (no literal
                  hanger icon) so it reads clearly even at this small size. */}
              <div
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "2px solid var(--sio-ink-soft)",
                  background: "var(--sio-paper, #fff)",
                  marginTop: -1,
                }}
              />
              <div aria-hidden style={{ width: 2, height: 16, background: "var(--sio-line)" }} />

              <div
                className="sio-card sio-rack-card"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: active ? "0 16px 28px rgba(22,20,15,0.22)" : "0 10px 20px rgba(22,20,15,0.12)",
                  transform: `rotateY(${active ? 0 : TILT_DEG}deg)`,
                  transformStyle: "preserve-3d",
                  transition: `transform ${FLIP_MS}ms ease, box-shadow ${FLIP_MS}ms ease`,
                }}
              >
                <img
                  src={p.images?.[0]?.url}
                  alt={p.title}
                  loading="lazy"
                  style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
                />
                <div style={{ padding: "8px 10px 10px" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.title}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>₹{p.basePrice.toLocaleString("en-IN")}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

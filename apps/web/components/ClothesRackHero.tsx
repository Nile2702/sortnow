import Link from "next/link";

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
// that's what the catalog actually has. Pure CSS/SVG, no 3D library - the
// sway is a single keyframe animation staggered per item (see
// app/globals.css's .sio-rack-sway), not a physics simulation.
export function ClothesRackHero({ products }: { products: RackProduct[] }) {
  const items = products.slice(0, 10);
  if (items.length === 0) return null;

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

      <div className="sio-scroll-row" style={{ padding: "0 20px", alignItems: "flex-start" }}>
        {items.map((p, i) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
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
              className="sio-card"
              style={{
                width: "100%",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 10px 20px rgba(22,20,15,0.12)",
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
        ))}
      </div>
    </section>
  );
}

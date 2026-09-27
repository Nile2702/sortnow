"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toggleWishlist, isWishlisted } from "../../lib/wishlist";
import { showToast } from "../../lib/toast";
import { getLocationPref } from "../../lib/location";

interface DeckProduct {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  storeSlug: string;
  storeName: string;
  distanceKm: number | null;
  stockRemaining?: number;
}

const DECK_SIZE = 30;
const SWIPE_THRESHOLD = 110;

// A Tinder-style "discover" mode, additive alongside the regular grid/search
// (see the homepage and /search) rather than replacing it - browsing a
// dense grid and swiping through a curated deck are different moods, and
// forcing everyone into one gesture would cost the other. Reuses the same
// search API and wishlist/toast helpers the rest of the site already uses,
// so "save" here is a real wishlist add, not a separate parallel list.
export default function DiscoverPage() {
  const [deck, setDeck] = useState<DeckProduct[] | null>(null);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [startX, setStartX] = useState(0);

  function loadDeck() {
    setDeck(null);
    setIndex(0);
    setSavedCount(0);
    const { pincode } = getLocationPref();
    // radius=20000 effectively disables distance filtering (nothing on the
    // platform is >20,000km away) while still computing a real distance for
    // display - a deliberately large deck shouldn't come up empty just
    // because this demo's seed stores are spread across seven different
    // cities with one seller each.
    fetch(`/api/v1/products/search?pincode=${pincode}&radius=20000&sort=newest`)
      .then((r) => r.json())
      .then((all: DeckProduct[]) => {
        const inStock = all.filter((p) => p.stockRemaining !== 0);
        setDeck(inStock.slice(0, DECK_SIZE));
      });
  }

  useEffect(() => {
    loadDeck();
  }, []);

  const current = deck?.[index];
  const next = deck?.[index + 1];

  function decide(dir: "left" | "right") {
    if (!current || exiting) return;
    if (dir === "right" && !isWishlisted(current.id)) {
      toggleWishlist({
        productId: current.id,
        title: current.title,
        storeSlug: current.storeSlug,
        storeName: current.storeName,
        price: current.basePrice,
        imageUrl: current.images[0]?.url ?? "",
      });
      setSavedCount((c) => c + 1);
      showToast(`Saved to Wishlist — ${current.title}`, "success");
    }
    setExiting(dir);
    setTimeout(() => {
      setExiting(null);
      setDragX(0);
      setIndex((i) => i + 1);
    }, 220);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return;
    setDragging(true);
    setStartX(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX);
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) decide("right");
    else if (dragX < -SWIPE_THRESHOLD) decide("left");
    else setDragX(0);
  }

  const rotation = useMemo(() => (exiting === "left" ? -22 : exiting === "right" ? 22 : dragX / 18), [dragX, exiting]);
  const translateX = exiting === "left" ? -560 : exiting === "right" ? 560 : dragX;

  return (
    <main style={{ maxWidth: 460, margin: "0 auto", padding: "16px 16px 24px", display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Discover</h1>
        <p style={{ color: "var(--sio-muted)", fontSize: 12.5, margin: "4px 0 0" }}>
          Swipe right to save, left to skip — or use the buttons below.
        </p>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 440, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!deck && <div className="sio-skeleton" style={{ width: "100%", aspectRatio: "3/4.2", borderRadius: 24 }} />}

        {deck && !current && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>You've seen everything nearby</h2>
            <p style={{ color: "var(--sio-muted)", fontSize: 13, marginBottom: 18 }}>
              {savedCount > 0 ? `Saved ${savedCount} item${savedCount === 1 ? "" : "s"} to your Wishlist.` : "Nothing saved this round — no worries."}
            </p>
            <button
              onClick={loadDeck}
              style={{ padding: "11px 22px", borderRadius: 999, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginRight: 10 }}
            >
              ↺ Start Over
            </button>
            <Link href="/" style={{ fontSize: 13, color: "var(--sio-muted)", textDecoration: "underline" }}>
              Back to browsing
            </Link>
          </div>
        )}

        {deck && deck.length === 0 && (
          <p style={{ color: "var(--sio-muted)", textAlign: "center", padding: 24 }}>Nothing to discover right now — check back soon.</p>
        )}

        {next && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 24,
              overflow: "hidden",
              transform: "scale(0.94) translateY(14px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              pointerEvents: "none",
            }}
          >
            <img src={next.images[0]?.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
          </div>
        )}

        {current && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
              touchAction: "none",
              cursor: dragging ? "grabbing" : "grab",
              transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
              opacity: exiting ? 0 : 1,
              transition: dragging ? "none" : "transform 0.25s ease, opacity 0.25s ease",
            }}
          >
            <img
              src={current.images[0]?.url}
              alt={current.title}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", userSelect: "none" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(220,38,38,0.9)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.05em",
                opacity: Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD)),
              }}
            >
              ✕ SKIP
            </div>
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(16,163,127,0.9)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.05em",
                opacity: Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD)),
              }}
            >
              ♥ SAVE
            </div>
            <Link
              href={`/product/${current.id}`}
              style={{ position: "absolute", inset: 0, zIndex: dragging ? -1 : 0 }}
              aria-label={`View ${current.title}`}
              onClick={(e) => {
                if (Math.abs(dragX) > 4) e.preventDefault();
              }}
            />
            <div style={{ position: "absolute", bottom: 18, left: 18, right: 18, color: "#fff", pointerEvents: "none" }}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{current.title}</div>
              <div style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 6 }}>
                {current.storeName}
                {current.distanceKm != null ? ` · ${current.distanceKm} km away` : ""}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                ₹{current.basePrice}
                {current.compareAtPrice && (
                  <span style={{ textDecoration: "line-through", marginLeft: 8, opacity: 0.6, fontSize: 13, fontWeight: 400 }}>
                    ₹{current.compareAtPrice}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {current && (
        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 20 }}>
          <button
            onClick={() => decide("left")}
            aria-label="Skip"
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              border: "1px solid var(--sio-line)",
              background: "#fff",
              color: "#dc2626",
              fontSize: 22,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            }}
          >
            ✕
          </button>
          <button
            onClick={() => decide("right")}
            aria-label="Save to wishlist"
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              border: "1px solid var(--sio-line)",
              background: "#fff",
              color: "var(--sio-bronze-dark)",
              fontSize: 22,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            }}
          >
            ♥
          </button>
        </div>
      )}
    </main>
  );
}

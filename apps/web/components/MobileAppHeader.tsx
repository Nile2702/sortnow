"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QUICK_MARKETS, getLocationPref, setLocationPref, LOCATION_CHANGED_EVENT, type QuickMarket } from "../lib/location";
import { isMobileAppShellPage } from "../lib/mobile-shell";
import { showToast } from "../lib/toast";
import { QrScannerModal } from "./QrScannerModal";
import { LogoBadge } from "./LogoBadge";

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--sio-bronze-dark)" : "currentColor"} strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
    </svg>
  );
}

// A browser's SpeechRecognition constructor isn't in TypeScript's built-in
// DOM lib, and only exists behind a vendor prefix in some browsers.
function getSpeechRecognition(): (new () => any) | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
}

// The app-style header (location + voice search + QR scan) shown in place
// of the normal site header on the two pages it makes sense for - the
// homepage and the search results list - per the seller/shopper feedback
// that browsing on mobile should feel like a normal shopping app's home
// screen rather than a scaled-down desktop layout. SiteHeader itself hides
// on mobile for these same two routes (see its own pathname check) so the
// two never show at once.
export function MobileAppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isAppPage = isMobileAppShellPage(pathname);
  const isListingPage = isAppPage && pathname !== "/";
  // Only the homepage gets the fuller, livelier banner treatment (greeting,
  // dark gradient, glow, trending chips) - every other app-shell page
  // (search, cart, wishlist, reservations...) keeps the plain compact
  // header, since a big hero banner would be out of place re-appearing on
  // every page navigation instead of just the first screen a shopper sees.
  const isHome = isAppPage && pathname === "/";

  const [location, setLocation] = useState<QuickMarket>(QUICK_MARKETS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocation(getLocationPref());
    function onChange(e: Event) {
      setLocation((e as CustomEvent<QuickMarket>).detail);
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChange);
  }, []);

  // Home's logo/location row collapses away once the page scrolls, so the
  // search bar slides up into its place instead of the banner permanently
  // eating a fixed chunk of the (already scarce) mobile viewport.
  useEffect(() => {
    if (!isHome) return;
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  if (!isAppPage) return null;

  function pickMarket(market: QuickMarket) {
    setLocationPref(market);
    setPickerOpen(false);
    router.push(`/?pincode=${market.pincode}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  }

  function handleMic() {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      showToast("Voice search isn't supported in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      showToast("Couldn't hear that. Try again.");
    };
    recognition.onresult = (event: any) => {
      const heard = event.results?.[0]?.[0]?.transcript?.trim();
      if (heard) {
        setQuery(heard);
        router.push(`/search?q=${encodeURIComponent(heard)}`);
      }
    };
    recognition.start();
  }

  return (
    <div
      className="sio-app-header"
      style={
        isHome
          ? { position: "relative", overflow: "hidden", background: "linear-gradient(135deg, var(--sio-ink) 0%, #0f2b26 100%)" }
          : undefined
      }
    >
      {isHome && (
        <>
          <div className="sio-grid-overlay" aria-hidden />
          <div className="sio-scanline" aria-hidden />
          <span className="sio-particle" aria-hidden style={{ width: 5, height: 5, left: "12%", top: "20%", animationDelay: "0s", animationDuration: "6s" }} />
          <span className="sio-particle" aria-hidden style={{ width: 4, height: 4, left: "82%", top: "60%", animationDelay: "1.4s", animationDuration: "7s" }} />
          <span className="sio-particle" aria-hidden style={{ width: 3, height: 3, left: "60%", top: "10%", animationDelay: "2.6s", animationDuration: "5s" }} />
        </>
      )}
      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "12px 16px 14px" }}>
        {isHome && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              maxHeight: scrolled ? 0 : 40,
              opacity: scrolled ? 0 : 1,
              marginBottom: scrolled ? 0 : 10,
              overflow: "hidden",
              transition: "max-height 0.25s ease, opacity 0.2s ease, margin-bottom 0.25s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <LogoBadge size={22} />
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>SORT IT OUT</span>
            </div>

            <div ref={pickerRef} style={{ position: "relative", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--sio-glow)",
                  maxWidth: "100%",
                }}
              >
                <PinIcon />
                <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
                  {location.label}
                </span>
                <ChevronDown />
              </button>

              {pickerOpen && (
                <div
                  className="sio-fade-in sio-glass"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    zIndex: 25,
                    borderRadius: 12,
                    padding: 8,
                    minWidth: 220,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
                  }}
                >
                  {QUICK_MARKETS.map((m) => (
                    <button
                      key={m.pincode}
                      type="button"
                      onClick={() => pickMarket(m)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: m.pincode === location.pincode ? "var(--sio-cream)" : "transparent",
                        color: "var(--sio-ink)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {!isHome && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          {isListingPage && (
            <button
              type="button"
              onClick={() => router.push("/")}
              aria-label="Back to Home"
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sio-ink)",
                cursor: "pointer",
                marginLeft: -6,
              }}
            >
              <BackIcon />
            </button>
          )}
          <div ref={pickerRef} style={{ position: "relative", minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: isHome ? "var(--sio-glow)" : "var(--sio-bronze-dark)",
                maxWidth: "100%",
              }}
            >
              <PinIcon />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 190,
                }}
              >
                {location.label}
              </span>
              <ChevronDown />
            </button>

            {pickerOpen && (
              <div
                className="sio-fade-in sio-glass"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  zIndex: 25,
                  borderRadius: 12,
                  padding: 8,
                  minWidth: 220,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
                }}
              >
                {QUICK_MARKETS.map((m) => (
                  <button
                    key={m.pincode}
                    type="button"
                    onClick={() => pickMarket(m)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: m.pincode === location.pincode ? "var(--sio-cream)" : "transparent",
                      color: "var(--sio-ink)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="Scan QR code"
            className={isHome ? "sio-glass sio-glow-ring" : undefined}
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: isHome ? undefined : "1px solid var(--sio-line)",
              background: isHome ? undefined : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isHome ? "var(--sio-glow)" : "var(--sio-ink)",
              cursor: "pointer",
            }}
          >
            <QrIcon />
          </button>
        </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <form onSubmit={handleSearchSubmit} style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--sio-muted)" }}>
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products…"
            autoComplete="off"
            style={{
              width: "100%",
              padding: "11px 44px",
              border: isHome ? "1px solid rgba(45,212,191,0.35)" : "1px solid var(--sio-line)",
              background: isHome ? "#fff" : "var(--sio-cream)",
              fontSize: 16,
              outline: "none",
              borderRadius: 999,
              boxShadow: isHome ? "0 6px 20px rgba(0,0,0,0.25)" : undefined,
            }}
          />
          <button
            type="button"
            onClick={handleMic}
            aria-label="Search by voice"
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: listening ? "rgba(13,148,136,0.14)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sio-ink-soft)",
              cursor: "pointer",
            }}
          >
            <MicIcon active={listening} />
          </button>
        </form>

        {isHome && (
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="Scan QR code"
            className="sio-glass sio-glow-ring"
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sio-glow)",
              cursor: "pointer",
            }}
          >
            <QrIcon />
          </button>
        )}
        </div>
      </div>

      {qrOpen && <QrScannerModal onClose={() => setQrOpen(false)} />}
    </div>
  );
}

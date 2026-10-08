"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { QUICK_MARKETS, getLocationPref, setLocationPref, resolveAreaLabel, LOCATION_CHANGED_EVENT, type QuickMarket, type LocationPref } from "../lib/location";
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

function MapIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" />
      <path d="M9 4v13M15 6.5v13" />
    </svg>
  );
}

// A browser's SpeechRecognition constructor isn't in TypeScript's built-in
// DOM lib, and only exists behind a vendor prefix in some browsers.
function getSpeechRecognition(): (new () => any) | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
}

// The homepage's top row (logo + location) collapses via
// `overflow: hidden` + `max-height` as the page scrolls, so its own picker
// dropdown would otherwise render inside that clipping box and be
// completely invisible - toggling the button worked, but nothing ever
// appeared to tap. Rendered through a portal into document.body instead,
// positioned from the toggle button's own on-screen rect, so it always
// escapes any ancestor's overflow/height clipping regardless of which of
// the header's two picker instances (top hero row vs. the persistent
// compact row) opened it.
function LocationDropdown({
  anchorRef,
  align,
  location,
  onPick,
  onUseGps,
  onPincode,
  locating,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  align: "left" | "right";
  location: LocationPref;
  onPick: (m: QuickMarket) => void;
  onUseGps: () => void;
  onPincode: (pincode: string) => void;
  locating: boolean;
}) {
  const [rect, setRect] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [pincodeInput, setPincodeInput] = useState("");

  useEffect(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setRect(
      align === "left"
        ? { top: r.bottom + 8, left: r.left }
        : { top: r.bottom + 8, right: window.innerWidth - r.right }
    );
  }, [anchorRef, align]);

  if (!rect) return null;

  return createPortal(
    <div
      className="sio-fade-in sio-glass"
      data-location-portal=""
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        right: rect.right,
        zIndex: 1000,
        borderRadius: 12,
        padding: 8,
        minWidth: 220,
        boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
      }}
    >
      <button
        type="button"
        onClick={onUseGps}
        disabled={locating}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          textAlign: "left",
          padding: "8px 10px",
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--sio-bronze-dark)",
          fontSize: 13,
          fontWeight: 700,
          cursor: locating ? "default" : "pointer",
          opacity: locating ? 0.6 : 1,
        }}
      >
        📍 {locating ? "Getting your location…" : "Use my current location"}
      </button>
      <div style={{ height: 1, background: "var(--sio-line)", margin: "4px 0" }} />
      {QUICK_MARKETS.map((m) => (
        <button
          key={m.pincode}
          type="button"
          onClick={() => onPick(m)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "8px 10px",
            borderRadius: 8,
            border: "none",
            background: "pincode" in location && m.pincode === location.pincode ? "var(--sio-cream)" : "transparent",
            color: "var(--sio-ink)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {m.label}
        </button>
      ))}
      <div style={{ height: 1, background: "var(--sio-line)", margin: "4px 0" }} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (/^\d{6}$/.test(pincodeInput)) onPincode(pincodeInput);
        }}
        style={{ display: "flex", gap: 6, padding: "4px 4px 2px" }}
      >
        <input
          value={pincodeInput}
          onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter PIN code"
          inputMode="numeric"
          style={{ flex: 1, minWidth: 0, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--sio-line)", fontSize: 13 }}
        />
        <button
          type="submit"
          disabled={!/^\d{6}$/.test(pincodeInput)}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: "none",
            background: /^\d{6}$/.test(pincodeInput) ? "var(--sio-ink)" : "var(--sio-line)",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: /^\d{6}$/.test(pincodeInput) ? "pointer" : "default",
          }}
        >
          Go
        </button>
      </form>
    </div>,
    document.body
  );
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

  const [location, setLocation] = useState<LocationPref>(QUICK_MARKETS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [locating, setLocating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocation(getLocationPref());
    function onChange(e: Event) {
      setLocation((e as CustomEvent<LocationPref>).detail);
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
      const target = e.target as Node;
      // The dropdown itself renders via a portal into document.body (see
      // LocationDropdown above), so it's never inside pickerRef's own DOM
      // subtree - without this check, a mousedown on a market button would
      // close the picker (unmounting the portal) before the button's own
      // click handler ever got to run.
      if (target instanceof Element && target.closest("[data-location-portal]")) return;
      if (pickerRef.current && !pickerRef.current.contains(target)) setPickerOpen(false);
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

  function pickPincode(pincode: string) {
    const known = QUICK_MARKETS.find((m) => m.pincode === pincode);
    setLocationPref({ label: known?.label ?? `PIN ${pincode}`, pincode });
    setPickerOpen(false);
    router.push(`/?pincode=${pincode}`);
    if (!known) {
      resolveAreaLabel({ pincode }, `PIN ${pincode}`).then((label) => setLocationPref({ label, pincode }));
    }
  }

  // Same robust GPS config as the first-visit LocationGate modal -
  // enableHighAccuracy + a longer timeout, since this header's picker is the
  // ONLY way to change location after that first prompt has already been
  // dismissed once (see hasSeenLocationPrompt) - without this here, a
  // shopper who skipped/denied it initially had no way to ever turn GPS
  // location on later short of clearing site data.
  function useGps() {
    if (!navigator.geolocation) {
      showToast("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await resolveAreaLabel({ lat, lng }, "Your Location");
        setLocating(false);
        setLocationPref({ label, lat, lng });
        setPickerOpen(false);
        router.push(`/?lat=${lat}&lng=${lng}`);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          showToast("Location access was blocked - check your browser's site settings, or enter a PIN code instead.");
        } else if (err.code === 3) {
          showToast("Getting your location took too long. Try again or enter a PIN code.");
        } else {
          showToast("Couldn't determine your location. Try a PIN code instead.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 }
    );
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
    <div className="sio-app-header" style={{ background: "var(--sio-paper)" }}>
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
              <span style={{ color: "var(--sio-ink)", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>SORT NOW</span>
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
                  color: "var(--sio-ink)",
                  maxWidth: "100%",
                }}
              >
                <PinIcon />
                <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
                  {location.label}
                </span>
                <ChevronDown />
              </button>

              {pickerOpen && <LocationDropdown anchorRef={pickerRef} align="right" location={location} onPick={pickMarket} onUseGps={useGps} onPincode={pickPincode} locating={locating} />}
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

            {pickerOpen && <LocationDropdown anchorRef={pickerRef} align="left" location={location} onPick={pickMarket} onUseGps={useGps} onPincode={pickPincode} locating={locating} />}
          </div>

          <button
            type="button"
            onClick={() => router.push("/shops?view=map")}
            aria-label="Stores near me"
            data-tooltip="Stores near me"
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
            className={`sio-tooltip${isHome ? " sio-glass" : ""}`}
          >
            <MapIcon />
          </button>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            aria-label="Scan QR code"
            data-tooltip="Scan QR code"
            className={`sio-tooltip${isHome ? " sio-glass sio-glow-ring" : ""}`}
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
              border: "1px solid var(--sio-line)",
              background: "var(--sio-cream)",
              fontSize: 16,
              outline: "none",
              borderRadius: 2,
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
          <>
            <button
              type="button"
              onClick={() => router.push("/shops?view=map")}
              aria-label="Stores near me"
              data-tooltip="Stores near me"
              className="sio-tooltip"
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1px solid var(--sio-line)",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sio-ink)",
                cursor: "pointer",
              }}
            >
              <MapIcon />
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="Scan QR code"
              data-tooltip="Scan QR code"
              className="sio-tooltip"
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1px solid var(--sio-line)",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sio-ink)",
                cursor: "pointer",
              }}
            >
              <QrIcon />
            </button>
          </>
        )}
        </div>
      </div>

      {qrOpen && <QrScannerModal onClose={() => setQrOpen(false)} />}
    </div>
  );
}

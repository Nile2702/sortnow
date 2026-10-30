"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setLocationPref, hasSeenLocationPrompt, markLocationPromptSeen, resolveAreaLabel, QUICK_MARKETS } from "../lib/location";
import { isMobileAppShellPage } from "../lib/mobile-shell";
import { PinIcon } from "./icons";

// Asks a first-time visitor for their location (GPS, or a typed PIN code)
// so "stores/products near you" actually means something from the very
// first page they see, instead of silently defaulting to Bandra, Mumbai
// until they notice and change it themselves. Shows once per device (see
// hasSeenLocationPrompt) on any shopper-facing page - not the seller
// portal, which isn't about "what's near this visitor".
export function LocationGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choice" | "manual">("choice");
  const [pincode, setPincodeInput] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = "location-gate-heading";

  useEffect(() => {
    if (isMobileAppShellPage(pathname) && !hasSeenLocationPrompt()) setOpen(true);
  }, [pathname]);

  // This is the very first interaction a new shopper has with the site -
  // previously a bare <div> with no dialog semantics, no focus moved into
  // it on open (a keyboard/screen-reader user had no idea anything had
  // appeared), and nothing closing it but the two explicit buttons. Moving
  // focus to the dialog itself on open, trapping Tab within it, and
  // supporting Escape all match standard native-dialog behavior a keyboard
  // user already expects from literally any other modal on the web.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      finish();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function finish() {
    markLocationPromptSeen();
    setOpen(false);
  }

  // Navigates to the homepage with the resolved location in the URL (not
  // just saved to localStorage) so its existing "sync filters from the
  // query string" effect picks it up immediately, the same mechanism
  // MobileAppHeader's own market picker already relies on - this modal can
  // pop up on any shopper page, not only the homepage.
  function goToResults(query: string) {
    router.push(`/?${query}`);
  }

  function handleAllowLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location access. Enter a PIN code instead.");
      setMode("manual");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Resolving the friendly area name (a real reverse-geocoding call,
        // see /api/v1/location/label) before closing the modal, so the
        // header shows an actual place name on the very first paint
        // instead of "Your Location" that then jumps to something else.
        const label = await resolveAreaLabel({ lat, lng }, "Your Location");
        setLocating(false);
        setLocationPref({ label, lat, lng });
        finish();
        goToResults(`lat=${lat}&lng=${lng}`);
      },
      (err) => {
        setLocating(false);
        setMode("manual");
        // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 =
        // POSITION_UNAVAILABLE, 3 = TIMEOUT - distinguished because "you
        // said no" and "your device couldn't get a fix" need different
        // fixes from the person reading this.
        if (err.code === 1) {
          setError(
            "Location access was blocked. Your browser may not have shown a permission prompt, or you dismissed/denied it - check your browser's site settings to allow location for this page, or enter a PIN code below."
          );
        } else if (err.code === 3) {
          setError("Getting your location took too long. Try again, or enter a PIN code below.");
        } else {
          setError("Couldn't determine your location (no GPS fix). Enter a PIN code below.");
        }
      },
      // Without enableHighAccuracy, the browser defaults to coarse
      // WiFi/cell-tower triangulation instead of GPS - fast, but easily
      // off by 1-3km, which was exactly the "2km away" reports. True GPS
      // takes longer to get a fix (hence the 20s timeout, up from 8s),
      // which is why this wasn't on from the start. maximumAge accepts a
      // position the OS already has cached from the last few minutes
      // instead of forcing a fresh fix every time.
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 }
    );
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6-digit PIN code.");
      return;
    }
    // A curated market's own label ("T. Nagar, Chennai") beats the generic
    // district/state a PIN-code lookup alone can give (see
    // resolveAreaLabel) - only fall back to that real lookup when the
    // typed PIN isn't one of these seven.
    const known = QUICK_MARKETS.find((m) => m.pincode === pincode);
    const label = known ? known.label : await resolveAreaLabel({ pincode }, `PIN ${pincode}`);
    setLocationPref({ label, pincode });
    finish();
    goToResults(`pincode=${pincode}`);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="sio-fade-in"
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--sio-paper, #fff)",
          borderRadius: "20px 20px 0 0",
          padding: "26px 22px 24px",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ marginBottom: 8, color: "var(--sio-ink)" }}><PinIcon size={30} strokeWidth={1.5} /></div>
        <h2 id={headingId} style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--sio-ink)" }}>Find shops and products near you</h2>
        <p style={{ fontSize: 13.5, color: "var(--sio-muted)", marginBottom: 18, lineHeight: 1.5 }}>
          SORT NOW shows you real boutiques and listings from sellers close to you. Allow location access, or enter your PIN code
          instead.
        </p>

        {mode === "choice" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="sio-btn-primary"
              onClick={handleAllowLocation}
              disabled={locating}
              style={{
                padding: "13px",
                border: "none",
                background: "var(--sio-bronze)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: locating ? "default" : "pointer",
                opacity: locating ? 0.7 : 1,
              }}
            >
              {locating ? (
                "Getting your location…"
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <PinIcon size={14} /> Allow Location Access
                </span>
              )}
            </button>
            <button
              onClick={() => setMode("manual")}
              style={{
                padding: "13px",
                borderRadius: 10,
                border: "1px solid var(--sio-line)",
                background: "#fff",
                color: "var(--sio-ink)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Enter PIN code manually
            </button>
            {error && (
              <p role="alert" style={{ color: "var(--sio-error)", fontSize: 12.5, margin: 0 }}>
                {error}
              </p>
            )}
            <button
              onClick={finish}
              style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer", padding: 6 }}
            >
              Skip for now
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label htmlFor="location-gate-pincode" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              6-digit PIN code
            </label>
            <input
              id="location-gate-pincode"
              value={pincode}
              onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit PIN code"
              maxLength={6}
              autoFocus
              aria-invalid={!!error}
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 16 }}
            />
            {error && (
              <p role="alert" style={{ color: "var(--sio-error)", fontSize: 12.5, margin: 0 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              className="sio-btn-primary"
              style={{ padding: "13px", border: "none", background: "var(--sio-bronze)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("choice");
                setError("");
              }}
              style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer", padding: 6 }}
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

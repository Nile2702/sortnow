"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setLocationPref, hasSeenLocationPrompt, markLocationPromptSeen } from "../lib/location";
import { isMobileAppShellPage } from "../lib/mobile-shell";

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

  useEffect(() => {
    if (isMobileAppShellPage(pathname) && !hasSeenLocationPrompt()) setOpen(true);
  }, [pathname]);

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
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocationPref({ label: "Your Location", lat, lng });
        finish();
        goToResults(`lat=${lat}&lng=${lng}`);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location - your browser may have blocked it. Enter a PIN code instead.");
        setMode("manual");
      },
      { timeout: 8000 }
    );
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6-digit PIN code.");
      return;
    }
    setLocationPref({ label: `PIN ${pincode}`, pincode });
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
        <div style={{ fontSize: 30, marginBottom: 8 }}>📍</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Find shops and products near you</h2>
        <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 18, lineHeight: 1.5 }}>
          SORT IT OUT shows you real boutiques and listings from sellers close to you. Allow location access, or enter your PIN code
          instead.
        </p>

        {mode === "choice" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleAllowLocation}
              disabled={locating}
              style={{
                padding: "13px",
                borderRadius: 999,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: locating ? "default" : "pointer",
                opacity: locating ? 0.7 : 1,
              }}
            >
              {locating ? "Getting your location…" : "📍 Allow Location Access"}
            </button>
            <button
              onClick={() => setMode("manual")}
              style={{
                padding: "13px",
                borderRadius: 999,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Enter PIN code manually
            </button>
            {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
            <button
              onClick={finish}
              style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", padding: 6 }}
            >
              Skip for now
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={pincode}
              onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit PIN code"
              maxLength={6}
              autoFocus
              style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 16 }}
            />
            {error && <p style={{ color: "#b91c1c", fontSize: 12.5, margin: 0 }}>{error}</p>}
            <button
              type="submit"
              style={{ padding: "13px", borderRadius: 999, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("choice");
                setError("");
              }}
              style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", padding: 6 }}
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

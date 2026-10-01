"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUICK_MARKETS,
  getLocationPref,
  setLocationPref,
  resolveAreaLabel,
  LOCATION_CHANGED_EVENT,
  type LocationPref,
} from "../lib/location";

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Desktop's equivalent of MobileAppHeader's own location picker (that one
// only renders below the 760px breakpoint) - same shared lib/location.ts
// state either way, so switching location on one updates the other on the
// next load. Previously the desktop header had no location control at all,
// so there was nothing to click there.
export function LocationPicker() {
  const router = useRouter();
  const [location, setLocation] = useState<LocationPref>(QUICK_MARKETS[0]);
  const [open, setOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocation(getLocationPref());
    function onChange(e: Event) {
      setLocation((e as CustomEvent<LocationPref>).detail);
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function applyAndClose(pref: LocationPref, query: string) {
    setLocationPref(pref);
    setOpen(false);
    setError("");
    router.push(`/?${query}`);
  }

  function pickMarket(m: (typeof QUICK_MARKETS)[number]) {
    applyAndClose(m, `pincode=${m.pincode}`);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const label = await resolveAreaLabel({ lat, lng }, "Your Location");
        setLocating(false);
        applyAndClose({ label, lat, lng }, `lat=${lat}&lng=${lng}`);
      },
      (err) => {
        setLocating(false);
        setError(err.code === 1 ? "Location access was blocked - check your browser's site settings." : "Couldn't get your location.");
      },
      // See LocationGate's own handler for why: 8s was too tight for a
      // real device to get a fix, and maximumAge lets a recently-cached
      // position answer instantly instead of forcing a fresh one.
      { timeout: 20000, maximumAge: 300000 }
    );
  }

  async function handlePincodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincodeInput)) {
      setError("Enter a valid 6-digit PIN code.");
      return;
    }
    const known = QUICK_MARKETS.find((m) => m.pincode === pincodeInput);
    const label = known ? known.label : await resolveAreaLabel({ pincode: pincodeInput }, `PIN ${pincodeInput}`);
    applyAndClose({ label, pincode: pincodeInput }, `pincode=${pincodeInput}`);
    setPincodeInput("");
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          padding: "8px 6px",
          cursor: "pointer",
          color: "var(--sio-ink-soft)",
          maxWidth: 190,
        }}
      >
        <PinIcon />
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {location.label}
        </span>
        <ChevronDown />
      </button>

      {open && (
        <div
          className="sio-fade-in sio-glass"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 30,
            borderRadius: 12,
            padding: 10,
            minWidth: 260,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
            background: "var(--sio-paper, #fff)",
          }}
        >
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "9px 10px",
              borderRadius: 8,
              border: "none",
              background: "var(--sio-cream)",
              color: "var(--sio-ink)",
              fontSize: 13,
              fontWeight: 600,
              cursor: locating ? "default" : "pointer",
              marginBottom: 8,
            }}
          >
            {locating ? "Getting your location…" : "📍 Use my current location"}
          </button>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sio-muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "4px 0 4px 4px" }}>
            Popular markets
          </div>
          {QUICK_MARKETS.map((m) => (
            <button
              key={m.pincode}
              type="button"
              onClick={() => pickMarket(m)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
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

          <form onSubmit={handlePincodeSubmit} style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--sio-line)" }}>
            <input
              value={pincodeInput}
              onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter PIN code"
              maxLength={6}
              style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--sio-line)", fontSize: 13 }}
            />
            <button
              type="submit"
              style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "var(--sio-ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Go
            </button>
          </form>
          {error && <p style={{ color: "#b91c1c", fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

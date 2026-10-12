import type { CSSProperties } from "react";

// Brand mark: a directional compass needle, pointing shoppers to what's
// near them - the whole point of an O2O "find it nearby" platform. Two
// triangles sharing a base (brand red on top, ink navy on bottom) read as
// a classic map-compass needle at a glance; the white/ink-ringed center
// pin is the "you are here" point it swings around. Kept in sync with
// --sio-bronze / --sio-ink in globals.css.
const BRAND_RED = "#A32A20";
const INK = "#282C3F";

export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50,10 L 58,50 L 42,50 Z" fill={BRAND_RED} />
      <path d="M 50,90 L 58,50 L 42,50 Z" fill={INK} />
      <circle cx="50" cy="50" r="7" fill="#fff" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

// The wordmark with the compass needle built into the "O" of "NOW" - the
// same two-tone needle as LogoBadge, just ringed by a circle standing in
// for the letter itself, instead of a separate icon sitting beside plain
// text. The ring and the needle's lower half use currentColor so they
// always match whatever color the surrounding text already is (ink on
// light pages, white on the seller portal's dark panels) - only the top
// wedge stays the fixed brand red, so the needle still pops on both.
// Every call site previously rendered its own <span style={...}>SORT
// NOW</span> with its own font size/weight/color - this takes that same
// style object so swapping it in doesn't change any of that sizing.
export function BrandWordmark({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", ...style }}>
      SORT N
      <svg width="0.72em" height="0.72em" viewBox="0 0 100 100" style={{ flexShrink: 0 }} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="16" />
        <path d="M 50,24 L 59,50 L 41,50 Z" fill={BRAND_RED} />
        <path d="M 50,76 L 59,50 L 41,50 Z" fill="currentColor" />
      </svg>
      W
    </span>
  );
}

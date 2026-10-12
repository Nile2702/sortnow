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

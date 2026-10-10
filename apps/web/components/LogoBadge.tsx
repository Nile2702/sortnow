// New brand mark (replaces the earlier circular badge), vertices measured
// directly from the supplied reference via pixel-edge scanning: a smaller
// triangle on the left, plus two larger triangles on the right that share
// a left edge but sit at different heights, overlapping each other and
// the left triangle. All three are the same semi-transparent red, so
// every overlap compounds into a visibly more saturated region - that's
// what gives the mark its layered look. Transparent canvas (just the
// icon, not the dark/white square backdrops it's been supplied on).
// Kept in sync with --sio-bronze in globals.css.
const BRAND_RED = "#A32A20";

export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0,19 L 0,81 L 35,50 Z" fill={BRAND_RED} fillOpacity="0.55" />
      <path d="M 24,0 L 24,79 L 84,38 Z" fill={BRAND_RED} fillOpacity="0.55" />
      <path d="M 24,21 L 24,100 L 85,69 Z" fill={BRAND_RED} fillOpacity="0.55" />
    </svg>
  );
}

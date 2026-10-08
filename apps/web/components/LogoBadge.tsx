// New brand mark (replaces the earlier circular badge): two overlapping
// right-pointing triangles in the brand's coral-red, transparent
// background - just the icon from the supplied logo, not its dark square
// backdrop (that was the artwork's canvas, not part of the mark itself).
// Semi-transparent fills on both triangles so the overlap reads as a
// natural darker blend, matching the reference art, rather than a flat
// single-tone shape.
const BRAND_RED = "#D6554B";

export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 18,22 L 18,78 L 62,50 Z" fill={BRAND_RED} fillOpacity="0.88" />
      <path d="M 38,22 L 38,78 L 82,50 Z" fill={BRAND_RED} fillOpacity="0.88" />
    </svg>
  );
}

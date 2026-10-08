// New brand mark (replaces the earlier circular badge): three overlapping
// right-pointing triangles cascading diagonally, in the brand's coral-red,
// transparent background - just the icon from the supplied logo, not its
// dark square backdrop (that was the artwork's canvas, not part of the
// mark itself). Semi-transparent fills so each overlap reads as a natural
// darker blend, matching the reference art's layered shading, rather than
// a flat single-tone shape.
const BRAND_RED = "#D6554B";

export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 14,12 L 14,50 L 52,31 Z" fill={BRAND_RED} fillOpacity="0.8" />
      <path d="M 18,32 L 18,70 L 56,51 Z" fill={BRAND_RED} fillOpacity="0.8" />
      <path d="M 22,52 L 22,90 L 60,71 Z" fill={BRAND_RED} fillOpacity="0.8" />
    </svg>
  );
}

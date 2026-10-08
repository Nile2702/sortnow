// New brand mark (replaces the earlier circular badge): two overlapping
// right-pointing triangles, same coral-red, each semi-transparent - a
// smaller/lower one on the left and a larger/taller one upper-right. Their
// overlap naturally compounds into a third, visibly more saturated region
// in the middle, which is what gives the mark its "three triangles" look
// even though it's built from two shapes. Transparent canvas (just the
// icon, not the dark/white square backdrops it's been supplied on).
const BRAND_RED = "#D6554B";

export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 1,15 L 1,78 L 51,46 Z" fill={BRAND_RED} fillOpacity="0.6" />
      <path d="M 23,0 L 23,100 L 83,49 Z" fill={BRAND_RED} fillOpacity="0.6" />
    </svg>
  );
}

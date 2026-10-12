// Brand mark, redrawn to match the hand-sketched logo exactly: a coat
// hanger whose hook and splayed wire double as the "S" that starts
// "SORT" - the hook sits where the S's top would be, the hanger's two
// wire arms fan out below it, and "now" is nested inside that V the way
// a garment would hang from it. "ORT" continues at the hook's own
// height to its right, so the whole thing reads "[hanger]ORT / now" -
// one combined graphic, not an icon next to separate text. Every stroke
// and letter uses currentColor so it adapts to whatever color context
// it's placed in (ink on light pages, white on the seller portal's dark
// panels), matching how the rest of the site's brand mark already works.
const VIEW_W = 400;
const VIEW_H = 215;
// Apex where the hook's stem meets the two wire arms.
const APEX_X = 145;
const APEX_Y = 115;

function HangerGlyph({ strokeWidth = 14 }: { strokeWidth?: number }) {
  return (
    <>
      {/* Hook: stem down to the apex, then the squared-off hook itself */}
      <path
        d={`M ${APEX_X},${APEX_Y} L ${APEX_X},54 L 205,54 L 205,82 L 172,82`}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* The two wire arms fanning out from the apex */}
      <path d={`M ${APEX_X},${APEX_Y} L 25,205`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" />
      <path d={`M ${APEX_X},${APEX_Y} L 265,205`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" />
    </>
  );
}

// Standalone icon - just the hanger, no text - for spots that only have
// room for a square mark (e.g. a favicon-style use) rather than the full
// lockup below.
export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VIEW_W} ${VIEW_H + 15}`} xmlns="http://www.w3.org/2000/svg">
      <HangerGlyph />
    </svg>
  );
}

// The full "[hanger]ORT / now" lockup - replaces every previous
// `<LogoBadge/><BrandWordmark/>` pairing with one combined graphic, since
// this design doesn't split cleanly into a separate icon and text (the
// hanger IS the S, and "now" sits inside the hanger's own wire rather
// than following "ORT" on the same line). `height` sets the rendered
// height in px; width follows automatically from the fixed aspect ratio.
export function FullLogo({ height = 40, className }: { height?: number; className?: string }) {
  const width = (height * VIEW_W) / VIEW_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} xmlns="http://www.w3.org/2000/svg" aria-label="SORT NOW">
      <HangerGlyph />
      <text x={APEX_X} y="172" textAnchor="middle" fontFamily="var(--site-font-heading), Poppins, sans-serif" fontWeight="800" fontSize="36" fill="currentColor">
        now
      </text>
      <text x="216" y="97" textAnchor="start" fontFamily="var(--site-font-heading), Poppins, sans-serif" fontWeight="800" fontSize="74" fill="currentColor">
        ORT
      </text>
    </svg>
  );
}

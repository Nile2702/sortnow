// Brand mark, redrawn to match the latest supplied logo file: a classic
// coat-hanger silhouette - hook, two arms splaying into a wide triangle,
// and a flat base closing it - rather than the previous open S-curve.
// The right arm, hook and base are one continuous navy-to-blue gradient
// stroke; the left arm is dark red and doubles as the "N" of "Now" by
// zigzagging partway down instead of running straight, the same way the
// previous version's N did. "ow" sits centered under the hook, inside
// the triangle. Fixed colors (not currentColor) to match the reference
// file exactly, same as the previous version.
const VIEW_W = 700;
const VIEW_H = 260;
const GRADIENT_ID = "sio-hanger-gradient";
const DARK_RED = "#8C1A42";
// Point where the hook's stem meets both arms.
const APEX = "450,98";

// Hook (loop) continuing into the right arm and the flat base - one
// unbroken stroke so the gradient flows smoothly across all three.
const NAVY_BLUE_PATH = `M 460,15 C 430,15 405,35 405,60 C 405,85 428,95 450,98 C 510,110 600,150 650,200 C 665,215 665,230 660,245 L 60,245`;
// Left arm from the same apex, zigzagging once on the way down to read
// as an "N" rather than a plain diagonal.
const RED_ARM_PATH = `M ${APEX} L 350,190 L 400,145 L 60,245`;

function HangerGradientDefs() {
  return (
    <defs>
      <linearGradient id={GRADIENT_ID} x1="405" y1="15" x2="660" y2="245" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1A2244" />
        <stop offset="55%" stopColor="#202E8C" />
        <stop offset="100%" stopColor="#2B3BDB" />
      </linearGradient>
    </defs>
  );
}

// The hanger alone - hook, both arms, and the base - no text. For spots
// that only have room for a small square icon.
export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} xmlns="http://www.w3.org/2000/svg">
      <HangerGradientDefs />
      <path d={NAVY_BLUE_PATH} fill="none" stroke={`url(#${GRADIENT_ID})`} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={RED_ARM_PATH} fill="none" stroke={DARK_RED} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The full lockup: the hanger with "Now" nested inside it, the way a
// garment hangs from the bar. `height` sets the rendered height in px;
// width follows automatically from the fixed aspect ratio.
export function FullLogo({ height = 40, className }: { height?: number; className?: string }) {
  const width = (height * VIEW_W) / VIEW_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} xmlns="http://www.w3.org/2000/svg" aria-label="SORT NOW">
      <HangerGradientDefs />
      <path d={NAVY_BLUE_PATH} fill="none" stroke={`url(#${GRADIENT_ID})`} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d={RED_ARM_PATH} fill="none" stroke={DARK_RED} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <text x="430" y="195" textAnchor="middle" fontFamily="var(--site-font-heading), Poppins, sans-serif" fontWeight="800" fontSize="64" fill={DARK_RED}>
        ow
      </text>
    </svg>
  );
}

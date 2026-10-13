// Brand mark, redrawn to match the supplied logo file exactly: a coat
// hanger (a rounded hook flowing into a long sweeping curve and a flat
// base, like the top and belly of a script "S") rendered in a fixed
// navy-to-blue gradient, paired with "Now" in a fixed dark red where the
// "N" is drawn as a sharp jagged zigzag rather than a plain letter. Unlike
// the previous mark, this one uses its own fixed colors rather than
// currentColor, because the reference file specifies exact colors rather
// than adapting to a surrounding theme.
const VIEW_W = 650;
const VIEW_H = 400;
const GRADIENT_ID = "sio-hanger-gradient";
const DARK_RED = "#8C1A1A";

function HangerGradientDefs() {
  return (
    <defs>
      <linearGradient id={GRADIENT_ID} x1="235" y1="55" x2="495" y2="340" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0A0A20" />
        <stop offset="55%" stopColor="#14147A" />
        <stop offset="100%" stopColor="#2E2EE0" />
      </linearGradient>
    </defs>
  );
}

// The hanger alone: hook, sweeping curve, and flat base - no text. For
// spots that only have room for a small square icon.
export function LogoBadge({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} xmlns="http://www.w3.org/2000/svg">
      <HangerGradientDefs />
      <path
        d="M 320,55 C 270,50 235,75 235,110 C 235,145 270,150 300,155 C 380,170 450,210 480,270 C 495,300 495,325 480,340 L 230,340"
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The full lockup: the hanger above "Now", with "Now" sitting on the
// hanger's flat base the way a garment would hang from it. `height` sets
// the rendered height in px; width follows automatically from the fixed
// aspect ratio.
export function FullLogo({ height = 40, className }: { height?: number; className?: string }) {
  const width = (height * VIEW_W) / VIEW_H;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} xmlns="http://www.w3.org/2000/svg" aria-label="SORT NOW">
      <HangerGradientDefs />
      <path
        d="M 320,55 C 270,50 235,75 235,110 C 235,145 270,150 300,155 C 380,170 450,210 480,270 C 495,300 495,325 480,340 L 230,340"
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 150,335 L 180,235 L 210,315 L 240,225" fill="none" stroke={DARK_RED} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
      <text x="250" y="335" fontFamily="var(--site-font-heading), Poppins, sans-serif" fontWeight="800" fontSize="110" fill={DARK_RED}>
        ow
      </text>
    </svg>
  );
}

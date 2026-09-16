// Explains the "Enhance with AI" pipeline to sellers before they click it -
// raw photo in, Gemini removes the background and composes the garment onto
// a mannequin, clean catalog photo out. Purely illustrative (stroke icons
// matching the site's existing icon style in SiteHeader.tsx), not a preview
// of their actual photo.
export function PhotoEnhanceIllustration() {
  return (
    <svg viewBox="0 0 640 190" width="100%" style={{ maxWidth: 480, display: "block" }} role="img" aria-label="Raw photo goes into Gemini AI, which removes the background and places the garment on a mannequin, producing a clean catalog-ready photo.">
      {/* Step 1: raw photo */}
      <g transform="translate(0,10)">
        <rect x="4" y="4" width="120" height="120" rx="14" fill="var(--sio-cream)" stroke="var(--sio-line)" strokeWidth="1.5" />
        {/* crooked garment sketch to suggest "raw / unpolished" */}
        <g transform="translate(64,64) rotate(-8)" stroke="var(--sio-muted)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-20,-28 L-8,-34 L0,-26 L8,-34 L20,-28 L14,-16 L9,-19 L9,30 L-9,30 L-9,-19 L-14,-16 Z" />
        </g>
        {/* small phone-camera glyph, bottom-right corner, to read as "quick phone photo" */}
        <g transform="translate(96,96)">
          <circle r="16" fill="var(--sio-paper)" stroke="var(--sio-line)" strokeWidth="1.5" />
          <rect x="-7" y="-5" width="14" height="10" rx="2" fill="none" stroke="var(--sio-muted)" strokeWidth="1.5" />
          <circle r="3" fill="none" stroke="var(--sio-muted)" strokeWidth="1.5" />
        </g>
        <text x="64" y="150" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--sio-ink)">
          Your raw photo
        </text>
      </g>

      {/* Arrow 1 */}
      <g transform="translate(140,60)">
        <path d="M0,10 H56" stroke="var(--sio-line)" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M50,3 L58,10 L50,17" fill="none" stroke="var(--sio-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Step 2: Gemini AI */}
      <g transform="translate(216,10)">
        <circle cx="64" cy="64" r="62" fill="none" stroke="var(--sio-bronze)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="64" cy="64" r="50" fill="var(--sio-paper)" stroke="var(--sio-bronze)" strokeWidth="1.5" />
        {/* sparkle icon */}
        <g transform="translate(64,64)" fill="var(--sio-bronze)">
          <path d="M0,-22 L5,-6 L21,0 L5,6 L0,22 L-5,6 L-21,0 L-5,-6 Z" />
          <path d="M22,-24 L24,-18 L30,-16 L24,-14 L22,-8 L20,-14 L14,-16 L20,-18 Z" opacity="0.7" />
        </g>
        <text x="64" y="150" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--sio-ink)">
          Gemini AI
        </text>
        <text x="64" y="167" textAnchor="middle" fontSize="10.5" fill="var(--sio-muted)">
          removes background +
        </text>
        <text x="64" y="180" textAnchor="middle" fontSize="10.5" fill="var(--sio-muted)">
          adds a mannequin
        </text>
      </g>

      {/* Arrow 2 */}
      <g transform="translate(352,60)">
        <path d="M0,10 H56" stroke="var(--sio-line)" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M50,3 L58,10 L50,17" fill="none" stroke="var(--sio-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Step 3: clean result */}
      <g transform="translate(428,10)">
        <rect x="4" y="4" width="120" height="120" rx="14" fill="#ffffff" stroke="var(--sio-line)" strokeWidth="1.5" />
        {/* mannequin torso + straight garment */}
        <g transform="translate(64,60)" stroke="var(--sio-ink-soft)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-18,-30 L-8,-34 L0,-28 L8,-34 L18,-30 L14,-18 L9,-21 L9,32 L-9,32 L-9,-21 L-14,-18 Z" />
          <line x1="0" y1="32" x2="0" y2="46" stroke="var(--sio-line)" strokeWidth="2" />
        </g>
        <text x="64" y="150" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--sio-ink)">
          Ready to list
        </text>
      </g>
    </svg>
  );
}

// Brand mark: the user's own logo file (public/brand/logo.png), used
// directly as an image rather than redrawn as hand-coded SVG - repeated
// attempts to recreate it in code kept drifting from the actual file, so
// this renders the real asset instead. The source file was a 1024x1024
// transparent-background export with large margins and a "Made with AI"
// badge in one corner; this copy is cropped tight to just the mark itself
// (358x216, aspect ratio preserved below) with the badge excluded.
const ASPECT_RATIO = 358 / 216;

// Standalone icon - the file itself is already the full "[hanger]ow"
// mark (there's no separate icon-only crop), so this and FullLogo render
// the same image; kept as two exports since every call site already
// expects one or the other.
export function LogoBadge({ size = 40 }: { size?: number }) {
  return <img src="/brand/logo.png" alt="" width={Math.round(size * ASPECT_RATIO)} height={size} style={{ display: "block" }} />;
}

// `height` sets the rendered height of the logo image in px (the "Sort
// Now" label below it adds its own height on top of that); width follows
// the image's own aspect ratio. Stacked rather than side-by-side because
// the logo image alone doesn't spell out the full name on its own.
export function FullLogo({ height = 40, className }: { height?: number; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: Math.round(height * 0.08) }}>
      <img src="/brand/logo.png" alt="" width={Math.round(height * ASPECT_RATIO)} height={height} style={{ display: "block" }} />
      <span
        style={{
          fontFamily: "var(--site-font-heading), Poppins, sans-serif",
          fontWeight: 700,
          fontSize: Math.max(10, Math.round(height * 0.3)),
          letterSpacing: "0.04em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        Sort Now
      </span>
    </span>
  );
}

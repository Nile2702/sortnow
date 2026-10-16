// Brand mark: the user's own logo file (public/brand/logo.png), used
// directly as an image rather than redrawn as hand-coded SVG - repeated
// attempts to recreate it in code kept drifting from the actual file, so
// this renders the real asset instead. The source file was a 500x500
// transparent-background export of the stacked "SORT"/"NOW" wordmark; this
// copy is cropped to the mark's real content bounding box plus a 15px
// margin (246x161, aspect ratio preserved below).
const ASPECT_RATIO = 246 / 161;

// Standalone icon - the file itself is already the full "SORT NOW"
// mark (there's no separate icon-only crop), so this and FullLogo render
// the same image; kept as two exports since every call site already
// expects one or the other.
export function LogoBadge({ size = 40 }: { size?: number }) {
  return <img src="/brand/logo.png" alt="" width={Math.round(size * ASPECT_RATIO)} height={size} style={{ display: "block" }} />;
}

// `height` sets the rendered height in px; width follows automatically
// from the file's own aspect ratio.
export function FullLogo({ height = 40, className }: { height?: number; className?: string }) {
  return (
    <img
      src="/brand/logo.png"
      alt="SORT NOW"
      width={Math.round(height * ASPECT_RATIO)}
      height={height}
      className={className}
      style={{ display: "block" }}
    />
  );
}

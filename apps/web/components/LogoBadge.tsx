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
// from the file's own aspect ratio. `chip`, for the few places this sits on
// a near-black bar (SellerNav, AdminNav, Footer, the seller login hero) -
// the new logo's "NOW" half is rendered in solid black, which disappears
// entirely against --sio-ink with nothing behind it (confirmed live: only
// "SORT" stayed legible). A light rounded backing restores contrast without
// needing a second, reversed logo asset. Every other call site (white/cream
// backgrounds) omits this and renders the plain image exactly as before.
export function FullLogo({ height = 40, className, chip = false }: { height?: number; className?: string; chip?: boolean }) {
  const img = (
    <img
      src="/brand/logo.png"
      alt="SORT NOW"
      width={Math.round(height * ASPECT_RATIO)}
      height={height}
      className={chip ? undefined : className}
      style={{ display: "block" }}
    />
  );
  if (!chip) return img;
  const pad = Math.max(4, Math.round(height * 0.18));
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "#fff",
        borderRadius: Math.round((height + pad * 2) * 0.22),
        padding: `${pad}px ${pad * 1.4}px`,
      }}
    >
      {img}
    </span>
  );
}

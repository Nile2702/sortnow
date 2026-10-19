// A funnel "sorting" animation in place of a generic spinner - three chips
// drop from a scattered spread above the funnel, converge into its neck,
// and fall out the bottom one at a time, looping. The one thing this app
// does is sort, so the loading state should look like that instead of a
// spinner that could belong to any site.
export function LoadingSpinner({ size = 48 }: { size?: number }) {
  return (
    <div className="sio-sort-loader" style={{ width: size, height: size }} role="status" aria-label="Loading">
      <svg viewBox="0 0 48 48" fill="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M6 10 H42 L28 30 V40 H20 V30 Z" stroke="var(--sio-ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="sio-sort-chip" />
      <span className="sio-sort-chip" />
      <span className="sio-sort-chip" />
    </div>
  );
}

// The common case every call site below actually wants - a centered spinner
// with a caption, replacing a bare "Loading…" text node that used to just
// sit flush against the page's padding with nothing else going on.
export function LoadingScreen({
  label = "Loading…",
  maxWidth = 600,
  minHeight = 240,
}: {
  label?: string;
  maxWidth?: number;
  minHeight?: number;
}) {
  return (
    <main
      style={{
        maxWidth,
        margin: "0 auto",
        padding: 40,
        minHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <LoadingSpinner />
      <p style={{ color: "var(--sio-muted)", fontSize: 13 }}>{label}</p>
    </main>
  );
}

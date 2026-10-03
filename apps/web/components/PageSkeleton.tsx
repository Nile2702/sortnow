// A pulsing placeholder for a full page's data-loading gate, replacing a
// bare "Loading…" text node - reuses the same .sio-skeleton shimmer the
// homepage's product rows already use, so a page that's still fetching
// reads as "something is coming" rather than a dead stop, and the layout
// doesn't jump around once the real content replaces it.
export function PageSkeleton({ maxWidth = 1000 }: { maxWidth?: number }) {
  return (
    <main style={{ maxWidth, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div className="sio-skeleton" style={{ height: 28, width: "40%", borderRadius: 8, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="sio-skeleton" style={{ height: 90, borderRadius: 14 }} />
        ))}
      </div>
      <div className="sio-skeleton" style={{ height: 220, borderRadius: 14 }} />
    </main>
  );
}

// A store-wide trust signal, aggregated across every review left on any
// of its products (see getStoreRatingSummary) - deliberately theme-neutral
// (no --store-primary/--store-accent) so it reads consistently as an
// independent signal regardless of how loud a given store's branding is.
export function StoreRatingBadge({ average, count }: { average: number; count: number }) {
  // No reviews yet isn't the same as "nothing to show" - leaving the badge
  // out entirely reads as a blank gap in the layout, easy to mistake for
  // something still loading. Saying so plainly also reads as more honest
  // than a 0.0 star rating would.
  if (count === 0) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          fontSize: 13,
          color: "#94a3b8",
        }}
      >
        <span aria-hidden>★</span>
        <span>No ratings yet</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        background: "#fffbeb",
        border: "1px solid #fde68a",
        fontSize: 13,
      }}
    >
      <span aria-hidden style={{ color: "#d97706" }}>
        ★
      </span>
      <strong style={{ color: "#92400e" }}>{average.toFixed(1)}</strong>
      <span style={{ color: "#78350f" }}>
        ({count} review{count === 1 ? "" : "s"})
      </span>
    </div>
  );
}

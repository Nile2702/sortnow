// A store-wide trust signal, aggregated across every review left on any
// of its products (see getStoreRatingSummary) - deliberately theme-neutral
// (no --store-primary/--store-accent) so it reads consistently as an
// independent signal regardless of how loud a given store's branding is.
export function StoreRatingBadge({ average, count }: { average: number; count: number }) {
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

interface Props {
  title: string;
  storeName?: string;
  basePrice: number;
  compareAtPrice?: number;
  stockRemaining?: number;
}

// Every product card (homepage, category pages, store pages) renders this,
// so a card's footprint is a fixed, uniform shape - it doesn't grow or
// shrink based on how long the title happens to be, or whether a stock
// warning applies to this particular item. Titles clamp to exactly 2 lines
// (reserved space either way) and the stock-warning line always reserves
// its height, even when empty, so cards in the same row line up exactly.
export function ProductCardInfo({ title, storeName, basePrice, compareAtPrice, stockRemaining }: Props) {
  const lowStock = stockRemaining != null && stockRemaining <= 5;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: "2.6em",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, minHeight: storeName ? undefined : 0 }}>{storeName ?? " "}</div>
      <div style={{ marginTop: 6 }}>
        <span style={{ fontWeight: 700 }}>₹{basePrice}</span>
        {compareAtPrice && <span style={{ textDecoration: "line-through", marginLeft: 6, opacity: 0.55, fontSize: 12 }}>₹{compareAtPrice}</span>}
      </div>
      <div style={{ fontSize: 12, color: "#e11d48", marginTop: 4, minHeight: 16 }}>{lowStock ? `Only ${stockRemaining} left` : " "}</div>
    </div>
  );
}

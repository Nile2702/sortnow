"use client";

import { useEffect, useState } from "react";

interface LiveSale {
  title: string;
  endsAt: string;
}

export function LiveSaleBanner({
  storeId,
  config,
}: {
  storeId: string;
  config?: { countdownStyle?: "digital" | "text" | "none"; badgeText?: string };
}) {
  const [sale, setSale] = useState<LiveSale | null>(null);

  useEffect(() => {
    // Backed by Redis key sale:live:{store_id} for a near-instant read.
    fetch(`/api/v1/stores/${storeId}/live-sale`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSale)
      .catch(() => setSale(null));
  }, [storeId]);

  if (!sale) return null;

  return (
    <div
      style={{
        background: "var(--sio-color-sale-badge)",
        color: "#fff",
        padding: "10px 16px",
        textAlign: "center",
        fontFamily: "var(--sio-font-heading)",
        fontWeight: 600,
      }}
    >
      {config?.badgeText ?? sale.title}
      {config?.countdownStyle !== "none" && <Countdown endsAt={sale.endsAt} style={config?.countdownStyle} />}
    </div>
  );
}

function Countdown({ endsAt, style }: { endsAt: string; style?: "digital" | "text" }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemainingMs(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remainingMs <= 0) return null;
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  const s = Math.floor((remainingMs % 60_000) / 1000);

  return (
    <span style={{ marginLeft: 10 }}>
      {style === "text" ? `Ends in ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`}
    </span>
  );
}

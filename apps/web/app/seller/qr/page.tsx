"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useSellerStore } from "../../../lib/use-seller-store";

const LABELS = ["Shop Window", "Billing Counter", "Table 1", "Table 2", "Trial Room"];

export default function QrMarketingPage() {
  const { store, loading } = useSellerStore();
  const [label, setLabel] = useState(LABELS[0]);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const targetUrl = store ? `https://sortitout.in/store/${store.slug}?src=qr&pos=${encodeURIComponent(label)}` : "";

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, { width: 400, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } }).then(setDataUrl);
  }, [targetUrl]);

  if (loading || !store) {
    return <main style={{ maxWidth: 900, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>QR Marketing Hub</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        Generate a QR standee for {store.name} — scanning it takes shoppers straight to your live catalog with real-time stock, completing
        the O2O foot-traffic loop (docs/03-multi-tenant-storefront.md §4).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Placement label</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {LABELS.map((l) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: label === l ? "2px solid #0f172a" : "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Links to</label>
          <code style={{ display: "block", fontSize: 12, background: "#f1f5f9", padding: "10px 12px", borderRadius: 8, wordBreak: "break-all", marginBottom: 20 }}>
            {targetUrl}
          </code>

          <p style={{ fontSize: 13, color: "#64748b" }}>
            Each scan is tagged with <code>src=qr&amp;pos={label}</code> so your dashboard can attribute footfall to this exact standee vs.
            online discovery — see the <code>store_analytics_events</code> table in <code>database/schema.sql</code>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="sio-card" style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", padding: 28, textAlign: "center" }}>
            {dataUrl ? <img src={dataUrl} alt="Store QR code" style={{ width: 220, height: 220 }} /> : <div style={{ width: 220, height: 220 }} />}
            <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 700, marginTop: 16 }}>{store.name}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Scan to shop our latest collection</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{label}</div>
          </div>

          {dataUrl && (
            <a
              href={dataUrl}
              download={`${store.slug}-qr-${label.toLowerCase().replace(/\s+/g, "-")}.png`}
              style={{
                marginTop: 16,
                padding: "10px 22px",
                borderRadius: 999,
                background: "#0f172a",
                color: "#fff",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Download PNG
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

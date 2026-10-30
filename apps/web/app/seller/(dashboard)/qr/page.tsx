"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { LoadingScreen } from "../../../../components/LoadingSpinner";

export default function QrMarketingPage() {
  const { store, loading } = useSellerStore();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // The site's own actual origin, not a hardcoded production domain - the
  // in-app QR scanner only follows a scanned code if it resolves to this
  // same origin (untrusted input otherwise), so a QR generated while
  // testing on localhost or a tunnel has to encode that same origin to be
  // scannable there at all. Falls back to the real domain in an SSR pass
  // before window exists (this only runs client-side, but keeps the
  // pre-mount targetUrl computation type-safe).
  const origin = typeof window !== "undefined" ? window.location.origin : "https://sortnow.in";
  // One QR per store, not one per physical placement - a seller can just
  // print as many copies of this same code as they need (shop window,
  // counter, tables, trial room...) since nothing about the code itself
  // differs by location, only where it's taped up.
  const targetUrl = store ? `${origin}/store/${store.slug}?src=qr` : "";

  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, { width: 400, margin: 2, color: { dark: "var(--sio-ink)", light: "#ffffff" } }).then(setDataUrl);
  }, [targetUrl]);

  if (loading || !store) {
    return <LoadingScreen maxWidth={900} />;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>QR Marketing Hub</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28 }}>
        Generate a QR standee for {store.name} — scanning it takes shoppers straight to your live catalog with real-time stock, turning
        foot traffic in your store into online discovery.
      </p>

      <div className="sio-two-col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Links to</label>
          <code style={{ display: "block", fontSize: 12, background: "var(--sio-cream)", padding: "10px 12px", borderRadius: 8, wordBreak: "break-all", marginBottom: 20 }}>
            {targetUrl}
          </code>

          <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>
            Print as many copies as you need — shop window, billing counter, trial room, wherever gets looked at. Every scan is tagged with{" "}
            <code>src=qr</code> so your Analytics &amp; Reports tab can tell QR-driven visits apart from online discovery.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="sio-card" style={{ background: "#fff", borderRadius: 20, border: "1px solid var(--sio-cream)", padding: 28, textAlign: "center" }}>
            {dataUrl ? <img src={dataUrl} alt="Store QR code" style={{ width: 220, height: 220 }} /> : <div style={{ width: 220, height: 220 }} />}
            <div style={{ fontFamily: "var(--site-font-heading)", fontWeight: 700, marginTop: 16 }}>{store.name}</div>
            <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>Scan to shop our latest collection</div>
          </div>

          {dataUrl && (
            <a
              href={dataUrl}
              download={`${store.slug}-qr.png`}
              style={{
                marginTop: 16,
                padding: "10px 22px",
                borderRadius: 999,
                background: "var(--sio-ink)",
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

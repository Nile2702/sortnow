"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "../lib/toast";

// A boutique's in-store signage or a shopper's flyer can carry a QR code
// pointing at its storefront or a specific product - this decodes it with
// the device camera, free and client-side (jsQR is a small dependency-free
// decoder, loaded the same CDN-ESM way @imgly/background-removal already
// is elsewhere in this app rather than adding it to package.json for a
// feature only this modal needs).
export function QrScannerModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      let jsQR: any;
      try {
        const mod = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm");
        jsQR = (mod as any).default ?? (mod as any).jsQR ?? mod;
      } catch {
        if (!cancelled) setError("Couldn't load the QR scanner. Check your connection and try again.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) setError("Couldn't access the camera. Check your browser's camera permission and try again.");
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });

      function tick() {
        const video = videoRef.current;
        if (cancelled || !video || !canvas || !ctx) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result?.data) {
            handleDecoded(result.data);
            return;
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    function handleDecoded(text: string) {
      stopCamera();
      // Only follow it if it resolves to a page on this same site - a QR
      // code is untrusted input, so a link to some other domain is shown
      // as plain text instead of being navigated to automatically.
      let path: string | null = null;
      try {
        if (text.startsWith("/")) {
          path = text;
        } else {
          const url = new URL(text);
          if (url.origin === window.location.origin) path = url.pathname + url.search;
        }
      } catch {
        path = null;
      }

      if (path && (path.startsWith("/product/") || path.startsWith("/store/"))) {
        onClose();
        router.push(path);
      } else {
        onClose();
        showToast(`Scanned: "${text}" — doesn't link to a product or store here.`);
      }
    }

    function stopCamera() {
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ color: "#fff", fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Scan a store or product QR code</div>

      {error ? (
        <p style={{ color: "#fca5a5", fontSize: 14, textAlign: "center", maxWidth: 280, marginBottom: 20 }}>{error}</p>
      ) : (
        <div style={{ position: "relative", width: "min(320px, 90vw)", aspectRatio: "1", borderRadius: 16, overflow: "hidden", background: "#000" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 24,
              border: "2px solid rgba(255,255,255,0.85)",
              borderRadius: 12,
              pointerEvents: "none",
            }}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 24,
          padding: "11px 28px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.4)",
          background: "transparent",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  );
}

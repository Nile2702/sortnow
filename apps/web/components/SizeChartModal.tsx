"use client";

import { useEffect } from "react";
import { CrossIcon } from "./icons";

interface SizeRow {
  size: string;
  chest: string;
  waist: string;
  hip: string;
}

// Generic India ready-to-wear reference chart (inches). SORT NOW is a
// multi-store marketplace with no per-seller measurement data, so this is a
// standard approximate chart rather than per-product sizing.
const SIZE_ROWS: SizeRow[] = [
  { size: "XS", chest: "34-35", waist: "28-29", hip: "34-35" },
  { size: "S", chest: "36-37", waist: "30-31", hip: "36-37" },
  { size: "M", chest: "38-39", waist: "32-33", hip: "38-39" },
  { size: "L", chest: "40-41", waist: "34-35", hip: "40-41" },
  { size: "XL", chest: "42-43", waist: "36-37", hip: "42-43" },
  { size: "XXL", chest: "44-45", waist: "38-39", hip: "44-45" },
  { size: "3XL", chest: "46-47", waist: "40-41", hip: "46-47" },
];

export function SizeChartModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,13,10,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Size chart"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--sio-paper)",
          borderRadius: 16,
          border: "1px solid var(--sio-line)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24,
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close size chart"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid var(--sio-line)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--sio-ink)",
          }}
        >
          <CrossIcon size={16} />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, paddingRight: 32 }}>Size Chart</h2>
        <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 18 }}>All measurements in inches</div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr>
              {["Size", "Chest", "Waist", "Hip"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 6px",
                    borderBottom: "1px solid var(--sio-line)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--sio-muted)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZE_ROWS.map((row) => (
              <tr key={row.size}>
                <td style={{ padding: "9px 6px", borderBottom: "1px solid var(--sio-line)", fontWeight: 600 }}>{row.size}</td>
                <td style={{ padding: "9px 6px", borderBottom: "1px solid var(--sio-line)" }}>{row.chest}</td>
                <td style={{ padding: "9px 6px", borderBottom: "1px solid var(--sio-line)" }}>{row.waist}</td>
                <td style={{ padding: "9px 6px", borderBottom: "1px solid var(--sio-line)" }}>{row.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 16, lineHeight: 1.5 }}>
          Measurements are approximate — sizes can vary slightly by brand/store. Visit the store to try before you buy.
        </div>
      </div>
    </div>
  );
}

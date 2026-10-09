"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onToast, ToastOptions } from "../lib/toast";

interface Toast extends ToastOptions {
  id: number;
}

let nextId = 1;

const TONE_STYLE: Record<NonNullable<ToastOptions["tone"]>, { border: string; icon: string }> = {
  default: { border: "var(--sio-glass-border)", icon: "✦" },
  success: { border: "rgba(34,197,94,0.5)", icon: "✓" },
  error: { border: "rgba(239,68,68,0.5)", icon: "✕" },
};

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return onToast((opts) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, ...opts }]);
      // A toast with an action link (e.g. "Go to Sort") gets longer on
      // screen - 3s is barely enough time to read the message, let alone
      // also decide to tap through.
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.action ? 5000 : 3000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const tone = TONE_STYLE[t.tone ?? "default"];
        return (
          <div
            key={t.id}
            className="sio-glass sio-fade-in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 7px 7px 14px",
              borderRadius: 999,
              border: `1px solid ${tone.border}`,
              color: "var(--sio-ink)",
              fontSize: 12.5,
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              pointerEvents: "auto",
            }}
          >
            <span style={{ fontSize: 12.5 }}>{tone.icon}</span>
            {t.message}
            {t.action && (
              <Link
                href={t.action.href}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "var(--sio-ink)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t.action.label} →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

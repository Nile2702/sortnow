"use client";

import { useEffect } from "react";
import { WarningIcon } from "../components/icons";

// Next.js renders this in place of a route segment whenever a render or
// data-fetch throws inside it - without it, an unhandled error falls back to
// a bare, unstyled default screen instead of something that matches the
// rest of the site. Doesn't catch errors in the root layout itself (see
// global-error.tsx for that).
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ maxWidth: 500, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "var(--sio-ink)" }}>
        <WarningIcon size={56} strokeWidth={1.6} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Something went sideways</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28 }}>
        That page hit an unexpected error. It's not you — try again, or head back and pick up where you left off.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "12px 28px",
            borderRadius: 999,
            border: "none",
            background: "var(--sio-ink)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            borderRadius: 999,
            border: "1px solid var(--sio-line)",
            color: "var(--sio-ink)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Back to discovery
        </a>
      </div>
    </main>
  );
}

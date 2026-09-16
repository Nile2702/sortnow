"use client";

// Catches an error thrown by the root layout itself (rare - most errors are
// caught by app/error.tsx instead) - since the root layout is what broke,
// this can't assume globals.css or any shared component rendered, so it
// defines its own full <html>/<body> and uses inline styles only.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#16140f" }}>
        <main style={{ maxWidth: 500, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>⚠️</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>SORT IT OUT hit a snag</h1>
          <p style={{ color: "#7a7468", marginBottom: 28 }}>Something broke at the site level. Reloading usually fixes it.</p>
          <button
            onClick={reset}
            style={{
              padding: "12px 28px",
              borderRadius: 999,
              border: "none",
              background: "#16140f",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}

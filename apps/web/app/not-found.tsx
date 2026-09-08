import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 500, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🧭</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Lost the sort?</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        We couldn't find that page. It may have moved, or the link might be off.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          borderRadius: 999,
          background: "#0f172a",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Back to discovery
      </Link>
    </main>
  );
}

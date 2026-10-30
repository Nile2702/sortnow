import Link from "next/link";
import { CompassIcon } from "../components/icons";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 500, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "var(--sio-ink)" }}>
        <CompassIcon size={56} strokeWidth={1.6} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Lost the sort?</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28 }}>
        We couldn't find that page. It may have moved, or the link might be off.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          borderRadius: 999,
          background: "var(--sio-ink)",
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

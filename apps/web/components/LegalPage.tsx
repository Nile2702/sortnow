import Link from "next/link";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ display: "flex", gap: 16, fontSize: 13, marginBottom: 24 }}>
        <Link href="/legal/terms" style={{ color: "var(--sio-bronze)", textDecoration: "none" }}>
          Terms of Use
        </Link>
        <Link href="/legal/privacy" style={{ color: "var(--sio-bronze)", textDecoration: "none" }}>
          Privacy Policy
        </Link>
        <Link href="/legal/refund-policy" style={{ color: "var(--sio-bronze)", textDecoration: "none" }}>
          Refund &amp; Cancellation
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
      <p style={{ color: "#94897a", fontSize: 13, marginBottom: 32 }}>Last updated: {updated}</p>

      <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--sio-ink)" }}>{children}</div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

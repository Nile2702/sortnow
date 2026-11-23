import Link from "next/link";
import { getVisitorList } from "../../../../lib/seed-data";

const WINDOWS: Record<string, { days: number; label: string }> = {
  today: { days: 1, label: "today" },
  "7d": { days: 7, label: "last 7 days" },
  "30d": { days: 30, label: "last 30 days" },
};

// Dedicated visitor list, split out of /admin/visitors (the overview) the
// same way /admin/customers/list is split from /admin/customers - a stat
// tile should navigate somewhere real, not just scroll the same page.
export default async function AdminVisitorListPage({ searchParams }: { searchParams: { window?: string } }) {
  const windowKey = searchParams.window && WINDOWS[searchParams.window] ? searchParams.window : "30d";
  const { days, label } = WINDOWS[windowKey];
  const visitors = await getVisitorList(days);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link href={`/admin/visitors`} style={{ fontSize: 13, color: "var(--sio-muted)", textDecoration: "none" }}>
        ← Visitors
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>Visitors — {label}</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24, fontSize: 14 }}>
        {visitors.length} anonymous visitor{visitors.length === 1 ? "" : "s"} active {label}.
      </p>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(WINDOWS).map(([key, w]) => (
            <Link
              key={key}
              href={`/admin/visitors/list?window=${key}`}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                border: key === windowKey ? "none" : "1px solid var(--sio-line)",
                background: key === windowKey ? "var(--sio-ink)" : "transparent",
                color: key === windowKey ? "#fff" : "var(--sio-muted)",
              }}
            >
              {w.label[0].toUpperCase() + w.label.slice(1)}
            </Link>
          ))}
        </div>

        {visitors.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No visits recorded {label}.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 0.6fr 1.2fr",
                gap: 12,
                padding: "8px 4px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--sio-muted)",
                borderBottom: "1px solid var(--sio-cream)",
              }}
            >
              <span>Visitor</span>
              <span>First seen</span>
              <span>Last seen</span>
              <span>Visits</span>
              <span>Last page</span>
            </div>
            {visitors.map((v) => (
              <Link
                key={v.visitorId}
                href={`/admin/visitors/${v.visitorId}`}
                className="sio-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 0.6fr 1.2fr",
                  gap: 12,
                  padding: "12px 4px",
                  fontSize: 13,
                  borderBottom: "1px solid var(--sio-cream)",
                  textDecoration: "none",
                  color: "var(--sio-ink)",
                }}
              >
                <span style={{ fontWeight: 600, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.visitorId}</span>
                <span style={{ color: "var(--sio-muted)" }}>{new Date(v.firstSeen).toLocaleString("en-IN")}</span>
                <span style={{ color: "var(--sio-muted)" }}>{new Date(v.lastSeen).toLocaleString("en-IN")}</span>
                <span style={{ fontWeight: 600 }}>{v.visitCount}</span>
                <span style={{ color: "var(--sio-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.lastPath}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

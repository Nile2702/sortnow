import Link from "next/link";
import { notFound } from "next/navigation";
import { getVisitorDetail } from "../../../../lib/seed-data";

// Full visit history for one anonymous visitor id. There is no name/phone/
// email behind this page - visitorId is a random id a browser keeps for
// itself (see lib/visitor-id.ts), so "detail" here means their browsing
// history on this site, not their identity.
export default async function AdminVisitorDetailPage({ params }: { params: { visitorId: string } }) {
  const visitor = await getVisitorDetail(params.visitorId);
  if (!visitor) notFound();

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link href={`/admin/visitors`} style={{ fontSize: 13, color: "var(--sio-muted)", textDecoration: "none" }}>
        ← Visitors
      </Link>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 4px", fontFamily: "monospace" }}>{visitor.visitorId}</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24, fontSize: 14 }}>
        First seen {new Date(visitor.firstSeen).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatTile value={visitor.totalVisits} label="Total page views" />
        <StatTile value={new Date(visitor.lastSeen).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} label="Last seen" />
        <StatTile value={new Date(visitor.firstSeen).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} label="First seen" />
        <StatTile value={visitor.locationLabel ?? "Unknown"} label="Location (self-reported)" />
      </div>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Visit history</h2>
        <p style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 16 }}>
          Most recent {visitor.visits.length} of {visitor.totalVisits} page view{visitor.totalVisits === 1 ? "" : "s"}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visitor.visits.map((v, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "10px 4px",
                borderBottom: "1px solid var(--sio-cream)",
                fontSize: 13,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.path}</div>
                {v.referrer && (
                  <div style={{ fontSize: 11.5, color: "var(--sio-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    from {v.referrer}
                  </div>
                )}
              </div>
              <span style={{ color: "var(--sio-muted)", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
                {new Date(v.occurredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 18 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--sio-ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

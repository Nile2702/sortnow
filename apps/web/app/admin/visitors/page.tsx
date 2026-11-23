import Link from "next/link";
import { getVisitorStats } from "../../../lib/seed-data";

// Admin-only, anonymous site-traffic view - who's visiting the site at all,
// as distinct from app/admin/customers (people who signed up or reserved).
// "Visitor" here is just a random id a browser keeps in localStorage (see
// lib/visitor-id.ts via components/VisitorTracking.tsx) - there is no name,
// phone, email, or IP address behind any number on this page, and nothing
// here can identify a real person. Same session-cookie gate as every other
// app/admin/* page, enforced in middleware.ts.
export default async function AdminVisitorsPage() {
  const stats = await getVisitorStats();
  const maxDaily = Math.max(1, ...stats.dailyUniqueVisitors.map((d) => d.count));
  const maxPath = Math.max(1, ...stats.topPaths.map((p) => p.count));
  const maxLocation = Math.max(1, ...stats.topLocations.map((l) => l.count));
  const totalActive30d = stats.newVisitors30d + stats.returningVisitors30d;
  const newPercent = totalActive30d > 0 ? Math.round((stats.newVisitors30d / totalActive30d) * 100) : 0;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Visitors</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24, fontSize: 14 }}>
        Anonymous site traffic across every page - a &ldquo;visitor&rdquo; is just a random id a browser keeps for itself, never a real
        identity. For who&apos;s actually signed up or reserved, see Customers &amp; Footfall.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatTile href={`/admin/visitors/list?window=today`} value={stats.uniqueVisitorsToday} label="Unique visitors today" />
        <StatTile href={`/admin/visitors/list?window=7d`} value={stats.uniqueVisitors7d} label="Unique visitors, 7 days" />
        <StatTile href={`/admin/visitors/list?window=30d`} value={stats.uniqueVisitors30d} label="Unique visitors, 30 days" />
        <StatTile value={stats.totalPageViews30d} label="Page views, 30 days" />
        <StatTile value={stats.avgPageViewsPerVisitor30d} label="Avg. page views / visitor" />
        <StatTile
          href={`/admin/visitors/list?window=30d`}
          value={`${newPercent}%`}
          label="New visitors, 30 days"
          sub={`${stats.newVisitors30d} new, ${stats.returningVisitors30d} returning`}
        />
      </div>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Unique visitors, last 14 days</h2>
        {stats.uniqueVisitors30d === 0 ? (
          <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No visits recorded yet.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
            {stats.dailyUniqueVisitors.map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  title={`${d.count} unique visitor${d.count === 1 ? "" : "s"} on ${d.date}`}
                  style={{
                    width: "100%",
                    height: Math.max(2, (d.count / maxDaily) * 90),
                    background: d.count > 0 ? "var(--sio-ink)" : "var(--sio-cream)",
                    borderRadius: 4,
                  }}
                />
                <span style={{ fontSize: 9, color: "var(--sio-muted)" }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Top pages, last 30 days</h2>
          {stats.topPaths.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No visits recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topPaths.map((p) => (
                <div key={p.path} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    title={p.path}
                    style={{ fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}
                  >
                    {p.path}
                  </span>
                  <div style={{ flex: 1, background: "var(--sio-cream)", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(p.count / maxPath) * 100}%`, height: "100%", background: "var(--sio-ink)" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Top locations, last 30 days</h2>
          <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginBottom: 12 }}>Self-reported by the visitor, never looked up from an IP address.</p>
          {stats.topLocations.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No visitor has set a location yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topLocations.map((l) => (
                <div key={l.location} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    title={l.location}
                    style={{ fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}
                  >
                    {l.location}
                  </span>
                  <div style={{ flex: 1, background: "var(--sio-cream)", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(l.count / maxLocation) * 100}%`, height: "100%", background: "var(--sio-ink)" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{l.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Link
        href={`/admin/visitors/list`}
        className="sio-card"
        style={{
          display: "block",
          textAlign: "center",
          padding: "16px",
          borderRadius: 16,
          border: "1px solid var(--sio-cream)",
          background: "#fff",
          color: "var(--sio-ink)",
          fontWeight: 600,
          fontSize: 14,
          textDecoration: "none",
          marginTop: 24,
        }}
      >
        View all visitors →
      </Link>
    </main>
  );
}

function StatTile({ value, label, sub, href }: { value: string | number; label: string; sub?: string; href?: string }) {
  const content = (
    <>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--sio-ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--sio-muted)", marginTop: 2 }}>{sub}</div>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="sio-card" style={{ display: "block", background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 18, textDecoration: "none" }}>
        {content}
      </Link>
    );
  }
  return (
    <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 18 }}>
      {content}
    </div>
  );
}

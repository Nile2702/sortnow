import Link from "next/link";
import { getPlatformCustomerStats } from "../../../lib/seed-data";

// Admin-only footfall analytics overview. Reached as
// /admin/customers?key=<ADMIN_SECRET> - middleware.ts rejects anything else
// with a 403 before this component ever runs, so the key (still needed
// below to carry forward into every link) has already been validated by
// the time we're here - same pattern as every other app/admin/* page.
//
// "Footfall" here specifically means a reservation actually picked up
// in-store (status "fulfilled") - this platform's only real signal that a
// shopper physically walked into a store, as opposed to just browsing
// online. Named "Customers & Footfall" rather than reusing the seller
// analytics page's own "Footfall" section (online page views/QR scans) to
// avoid the two meaning different things under the same name.
//
// Every stat tile is a real link to a dedicated page
// (app/admin/customers/list or .../activity), not an in-page filter+scroll -
// that was tried first and felt broken (clicking a KPI, landing on a
// page that looks unchanged). The customer list and the reservation
// activity feed live on their own pages for the same reason a click should
// go somewhere, not just move the scrollbar.
export default async function AdminCustomersPage({ searchParams }: { searchParams: { key?: string } }) {
  const key = searchParams.key ?? "";
  const keyQS = `key=${encodeURIComponent(key)}`;

  const stats = await getPlatformCustomerStats();

  const maxDaily = Math.max(1, ...stats.dailyFootfall.map((d) => d.count));
  const maxStoreFootfall = Math.max(1, ...stats.topStoresByFootfall.map((s) => s.count));
  const maxCity = Math.max(1, ...stats.topCities.map((c) => c.count));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Customers &amp; Footfall</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24, fontSize: 14 }}>
        Every shopper who's signed up, and how many of them actually walked into a store (a reservation picked up, not just booked). Click any number below for the full list.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatTile href={`/admin/customers/list?${keyQS}`} value={stats.totalCustomers} label="Total customers" />
        <StatTile href={`/admin/customers/list?${keyQS}&joined=week`} value={stats.newCustomersThisWeek} label="New this week" />
        <StatTile href={`/admin/customers/list?${keyQS}&joined=month`} value={stats.newCustomersThisMonth} label="New this month" />
        <StatTile href={`/admin/customers/list?${keyQS}&referred=1`} value={stats.referredSignupCount} label="Signed up via referral" />
        <StatTile href={`/admin/customers/activity?${keyQS}`} value={stats.totalReservations} label="Total reservations" />
        <StatTile href={`/admin/customers/activity?${keyQS}&status=fulfilled`} value={stats.fulfilled} label="Store visits" />
        <StatTile href={`/admin/customers/activity?${keyQS}&status=pending`} value={stats.pending} label="Pending pickups" />
        <StatTile href={`/admin/customers/activity?${keyQS}&status=cancelled`} value={stats.cancelled} label="Cancelled" />
        <StatTile
          href={`/admin/customers/activity?${keyQS}&status=expired`}
          value={`${stats.uncollectedPercent}%`}
          label="No-show rate"
          sub={`${stats.expired} expired of ${stats.fulfilled + stats.expired} resolved`}
        />
        <StatTile
          href={`/admin/customers/list?${keyQS}&repeat=1`}
          value={`${stats.repeatCustomerPercent}%`}
          label="Repeat-visit rate"
          sub={`${stats.repeatCustomerCount} of ${stats.customersWithAVisit} who've visited`}
        />
      </div>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Store visits, last 14 days</h2>
        {stats.fulfilled === 0 ? (
          <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No reservations have been picked up yet.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
            {stats.dailyFootfall.map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  title={`${d.count} visit${d.count === 1 ? "" : "s"} on ${d.date}`}
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
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Top stores by footfall</h2>
          {stats.topStoresByFootfall.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No store visits yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topStoresByFootfall.map((s) => (
                <div key={s.storeId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link
                    href={`/admin/sellers/${s.storeId}?${keyQS}`}
                    style={{ fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--sio-ink)", fontWeight: 600, textDecoration: "none" }}
                  >
                    {s.storeName}
                  </Link>
                  <div style={{ flex: 1, background: "var(--sio-cream)", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(s.count / maxStoreFootfall) * 100}%`, height: "100%", background: "var(--sio-ink)" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Customers by city</h2>
          {stats.topCities.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No city on file for any customer yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topCities.map((c) => (
                <div key={c.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link
                    href={`/admin/customers/list?${keyQS}&q=${encodeURIComponent(c.city)}`}
                    style={{ fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--sio-ink)", textDecoration: "none" }}
                  >
                    {c.city}
                  </Link>
                  <div style={{ flex: 1, background: "var(--sio-cream)", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(c.count / maxCity) * 100}%`, height: "100%", background: "var(--sio-ink)" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href={`/admin/customers/list?${keyQS}`}
          className="sio-card"
          style={{ flex: 1, textAlign: "center", padding: "16px", borderRadius: 16, border: "1px solid var(--sio-cream)", background: "#fff", color: "var(--sio-ink)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
        >
          View all customers →
        </Link>
        <Link
          href={`/admin/customers/activity?${keyQS}`}
          className="sio-card"
          style={{ flex: 1, textAlign: "center", padding: "16px", borderRadius: 16, border: "1px solid var(--sio-cream)", background: "#fff", color: "var(--sio-ink)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
        >
          View all activity →
        </Link>
      </div>
    </main>
  );
}

function StatTile({ value, label, sub, href }: { value: string | number; label: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="sio-card" style={{ display: "block", background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 18, textDecoration: "none" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--sio-ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--sio-muted)", marginTop: 2 }}>{sub}</div>}
    </Link>
  );
}

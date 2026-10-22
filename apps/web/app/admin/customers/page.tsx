import Link from "next/link";
import { getAllShoppers, getAllReservations, getPlatformCustomerStats, Reservation } from "../../../lib/seed-data";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  fulfilled: { bg: "#f0fdf4", color: "#16a34a", label: "Visited" },
  pending: { bg: "#eff6ff", color: "#1d4ed8", label: "Pending" },
  expired: { bg: "#fef2f2", color: "#b91c1c", label: "No-show" },
  cancelled: { bg: "#f8fafc", color: "#64748b", label: "Cancelled" },
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Admin-only customer directory + platform-wide footfall analytics. Reached
// as /admin/customers?key=<ADMIN_SECRET> - middleware.ts rejects anything
// else with a 403 before this component ever runs, so the key (still
// needed below to carry forward into every link) has already been
// validated by the time we're here - same pattern as every other
// app/admin/* page.
//
// "Footfall" here specifically means a reservation actually picked up
// in-store (status "fulfilled") - this platform's only real signal that a
// shopper physically walked into a store, as opposed to just browsing
// online. Named "Customers & Footfall" rather than reusing the seller
// analytics page's own "Footfall" section (online page views/QR scans) to
// avoid the two meaning different things under the same name.
//
// Every stat tile up top is a real drill-down, not decoration - each links
// into either the customer table (#customers) or the activity feed
// (#activity) below with the matching filter already applied, rather than
// just restating a number nothing can be done with.
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { key?: string; q?: string; joined?: string; referred?: string; repeat?: string; status?: string };
}) {
  const key = searchParams.key ?? "";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const keyQS = `key=${encodeURIComponent(key)}`;
  const joined = searchParams.joined; // "week" | "month" | undefined
  const referredOnly = searchParams.referred === "1";
  const repeatOnly = searchParams.repeat === "1";
  const statusFilter = searchParams.status; // ReservationStatus | undefined

  const [stats, shoppers, allReservations] = await Promise.all([getPlatformCustomerStats(), getAllShoppers(), getAllReservations()]);

  // Per-phone reservation/visit counts - backs both the repeat-visit filter
  // below and the customer table's own Reservations/Visits columns, so a
  // "0 of 0 who've visited" repeat-rate stat and a 0-visit customer row
  // agree with each other instead of being two independently-computed
  // numbers that could quietly drift apart.
  const reservationCountByPhone = new Map<string, number>();
  const visitCountByPhone = new Map<string, number>();
  for (const r of allReservations) {
    reservationCountByPhone.set(r.shopperPhone, (reservationCountByPhone.get(r.shopperPhone) ?? 0) + 1);
    if (r.status === "fulfilled") visitCountByPhone.set(r.shopperPhone, (visitCountByPhone.get(r.shopperPhone) ?? 0) + 1);
  }
  const shopperIdByPhone = new Map(shoppers.map((s) => [s.phone, s.id]));

  const now = Date.now();
  let filteredShoppers = shoppers;
  if (q) filteredShoppers = filteredShoppers.filter((s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.email ?? "").toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q));
  if (joined === "week") filteredShoppers = filteredShoppers.filter((s) => now - new Date(s.createdAt).getTime() <= WEEK_MS);
  if (joined === "month") filteredShoppers = filteredShoppers.filter((s) => now - new Date(s.createdAt).getTime() <= MONTH_MS);
  if (referredOnly) filteredShoppers = filteredShoppers.filter((s) => s.referredBy);
  if (repeatOnly) filteredShoppers = filteredShoppers.filter((s) => (visitCountByPhone.get(s.phone) ?? 0) >= 2);

  const activityFeed: Reservation[] = statusFilter ? allReservations.filter((r) => r.status === statusFilter).slice(0, 50) : stats.recentReservations;

  const customerFilterActive = Boolean(q || joined || referredOnly || repeatOnly);
  const activityFilterLabel = statusFilter ? STATUS_STYLE[statusFilter]?.label ?? statusFilter : null;

  const maxDaily = Math.max(1, ...stats.dailyFootfall.map((d) => d.count));
  const maxStoreFootfall = Math.max(1, ...stats.topStoresByFootfall.map((s) => s.count));
  const maxCity = Math.max(1, ...stats.topCities.map((c) => c.count));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Customers &amp; Footfall</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        Every shopper who's signed up, and how many of them actually walked into a store (a reservation picked up, not just booked). Click any number below to drill in.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatTile href={`/admin/customers?${keyQS}#customers`} value={stats.totalCustomers} label="Total customers" />
        <StatTile href={`/admin/customers?${keyQS}&joined=week#customers`} value={stats.newCustomersThisWeek} label="New this week" />
        <StatTile href={`/admin/customers?${keyQS}&joined=month#customers`} value={stats.newCustomersThisMonth} label="New this month" />
        <StatTile href={`/admin/customers?${keyQS}&referred=1#customers`} value={stats.referredSignupCount} label="Signed up via referral" />
        <StatTile href={`/admin/customers?${keyQS}#activity`} value={stats.totalReservations} label="Total reservations" />
        <StatTile href={`/admin/customers?${keyQS}&status=fulfilled#activity`} value={stats.fulfilled} label="Store visits" />
        <StatTile href={`/admin/customers?${keyQS}&status=pending#activity`} value={stats.pending} label="Pending pickups" />
        <StatTile href={`/admin/customers?${keyQS}&status=cancelled#activity`} value={stats.cancelled} label="Cancelled" />
        <StatTile
          href={`/admin/customers?${keyQS}&status=expired#activity`}
          value={`${stats.uncollectedPercent}%`}
          label="No-show rate"
          sub={`${stats.expired} expired of ${stats.fulfilled + stats.expired} resolved`}
        />
        <StatTile
          href={`/admin/customers?${keyQS}&repeat=1#customers`}
          value={`${stats.repeatCustomerPercent}%`}
          label="Repeat-visit rate"
          sub={`${stats.repeatCustomerCount} of ${stats.customersWithAVisit} who've visited`}
        />
      </div>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Store visits, last 14 days</h2>
        {stats.fulfilled === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>No reservations have been picked up yet.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
            {stats.dailyFootfall.map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  title={`${d.count} visit${d.count === 1 ? "" : "s"} on ${d.date}`}
                  style={{
                    width: "100%",
                    height: Math.max(2, (d.count / maxDaily) * 90),
                    background: d.count > 0 ? "#0f172a" : "#f1f5f9",
                    borderRadius: 3,
                  }}
                />
                <span style={{ fontSize: 9, color: "#94a3b8" }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Top stores by footfall</h2>
          {stats.topStoresByFootfall.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>No store visits yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topStoresByFootfall.map((s) => (
                <div key={s.storeId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link
                    href={`/admin/sellers/${s.storeId}?${keyQS}`}
                    style={{ fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0f172a", fontWeight: 600, textDecoration: "none" }}
                  >
                    {s.storeName}
                  </Link>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(s.count / maxStoreFootfall) * 100}%`, height: "100%", background: "#0f172a" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Customers by city</h2>
          {stats.topCities.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>No city on file for any customer yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.topCities.map((c) => (
                <div key={c.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <a
                    href={`/admin/customers?${keyQS}&q=${encodeURIComponent(c.city)}#customers`}
                    style={{ fontSize: 13, width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0f172a", textDecoration: "none" }}
                  >
                    {c.city}
                  </a>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 999, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(c.count / maxCity) * 100}%`, height: "100%", background: "#0f172a" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section id="activity" className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24, scrollMarginTop: 88 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{activityFilterLabel ? `Activity — ${activityFilterLabel}` : "Recent activity"}</h2>
          {statusFilter && (
            <a href={`/admin/customers?${keyQS}#activity`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
              Clear filter
            </a>
          )}
        </div>
        {activityFeed.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>{statusFilter ? "No reservations match this filter." : "No reservations yet."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {activityFeed.map((r) => {
              const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.cancelled;
              const shopperId = shopperIdByPhone.get(r.shopperPhone);
              return (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f8fafc", fontSize: 13, flexWrap: "wrap" }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: style.bg, color: style.color, flexShrink: 0 }}>{style.label}</span>
                  {shopperId ? (
                    <Link href={`/admin/customers/${shopperId}?${keyQS}`} style={{ fontWeight: 600, color: "#0f172a", textDecoration: "none" }}>
                      {r.shopperName}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{r.shopperName}</span>
                  )}
                  <span style={{ color: "#94a3b8" }}>at</span>
                  <Link href={`/admin/sellers/${r.storeId}?${keyQS}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                    {r.storeName}
                  </Link>
                  <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 12 }}>
                    {r.status === "fulfilled" && r.fulfilledAt
                      ? new Date(r.fulfilledAt).toLocaleString("en-IN")
                      : new Date(r.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section id="customers" className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, scrollMarginTop: 88 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>
            {customerFilterActive ? `${filteredShoppers.length} of ${shoppers.length} customers` : `${shoppers.length} customer${shoppers.length === 1 ? "" : "s"}`}
            {joined === "week" && " — joined this week"}
            {joined === "month" && " — joined this month"}
            {referredOnly && " — via referral"}
            {repeatOnly && " — 2+ visits"}
          </h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <form method="get" style={{ display: "flex", gap: 8 }}>
              <input type="hidden" name="key" value={key} />
              <input
                type="text"
                name="q"
                defaultValue={searchParams.q ?? ""}
                placeholder="Search name, phone, email, or city"
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, width: 220 }}
              />
              <button type="submit" style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Search
              </button>
            </form>
            {customerFilterActive && (
              <a href={`/admin/customers?${keyQS}#customers`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
                Clear filters
              </a>
            )}
          </div>
        </div>

        {filteredShoppers.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>No customers match these filters.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1.1fr 1.3fr 0.9fr 0.9fr 0.7fr 0.7fr",
                gap: 12,
                padding: "8px 4px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "#94a3b8",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span>Name</span>
              <span>Phone</span>
              <span>Email</span>
              <span>City</span>
              <span>Joined</span>
              <span>Bookings</span>
              <span>Visits</span>
            </div>
            {filteredShoppers.map((s) => (
              <Link
                key={s.id}
                href={`/admin/customers/${s.id}?${keyQS}`}
                className="sio-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1.1fr 1.3fr 0.9fr 0.9fr 0.7fr 0.7fr",
                  gap: 12,
                  padding: "12px 4px",
                  fontSize: 13,
                  borderBottom: "1px solid #f8fafc",
                  textDecoration: "none",
                  color: "#0f172a",
                }}
              >
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span>{s.phone}</span>
                <span style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email || "—"}</span>
                <span style={{ color: "#64748b" }}>{s.city || "—"}</span>
                <span style={{ color: "#64748b" }}>{new Date(s.createdAt).toLocaleDateString("en-IN")}</span>
                <span style={{ color: "#64748b" }}>{reservationCountByPhone.get(s.phone) ?? 0}</span>
                <span style={{ color: (visitCountByPhone.get(s.phone) ?? 0) > 0 ? "#16a34a" : "#64748b", fontWeight: 600 }}>{visitCountByPhone.get(s.phone) ?? 0}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatTile({ value, label, sub, href }: { value: string | number; label: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="sio-card" style={{ display: "block", background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 18, textDecoration: "none" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
    </Link>
  );
}

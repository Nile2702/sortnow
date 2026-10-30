import Link from "next/link";
import { getAllShoppers, getAllReservations } from "../../../../lib/seed-data";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Dedicated customer list/search page, split out of /admin/customers (the
// overview dashboard) so a stat tile like "New this week" or "Repeat-visit
// rate" navigates somewhere real instead of just scrolling the same page -
// clicking a KPI and landing on an unchanged-looking page read as broken.
export default async function AdminCustomerListPage({
  searchParams,
}: {
  searchParams: { key?: string; q?: string; joined?: string; referred?: string; repeat?: string };
}) {
  const key = searchParams.key ?? "";
  const keyQS = `key=${encodeURIComponent(key)}`;
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const joined = searchParams.joined; // "week" | "month" | undefined
  const referredOnly = searchParams.referred === "1";
  const repeatOnly = searchParams.repeat === "1";

  const [shoppers, reservations] = await Promise.all([getAllShoppers(), getAllReservations()]);

  const reservationCountByPhone = new Map<string, number>();
  const visitCountByPhone = new Map<string, number>();
  for (const r of reservations) {
    reservationCountByPhone.set(r.shopperPhone, (reservationCountByPhone.get(r.shopperPhone) ?? 0) + 1);
    if (r.status === "fulfilled") visitCountByPhone.set(r.shopperPhone, (visitCountByPhone.get(r.shopperPhone) ?? 0) + 1);
  }

  const now = Date.now();
  let filtered = shoppers;
  if (q) filtered = filtered.filter((s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.email ?? "").toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q));
  if (joined === "week") filtered = filtered.filter((s) => now - new Date(s.createdAt).getTime() <= WEEK_MS);
  if (joined === "month") filtered = filtered.filter((s) => now - new Date(s.createdAt).getTime() <= MONTH_MS);
  if (referredOnly) filtered = filtered.filter((s) => s.referredBy);
  if (repeatOnly) filtered = filtered.filter((s) => (visitCountByPhone.get(s.phone) ?? 0) >= 2);

  const filterActive = Boolean(q || joined || referredOnly || repeatOnly);
  const filterLabel = [joined === "week" && "joined this week", joined === "month" && "joined this month", referredOnly && "via referral", repeatOnly && "2+ visits"]
    .filter(Boolean)
    .join(", ");

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link href={`/admin/customers?${keyQS}`} style={{ fontSize: 13, color: "var(--sio-muted)", textDecoration: "none" }}>
        ← Customers &amp; Footfall
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>Customers{filterLabel ? ` — ${filterLabel}` : ""}</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24, fontSize: 14 }}>
        {filterActive ? `${filtered.length} of ${shoppers.length} customers` : `${shoppers.length} customer${shoppers.length === 1 ? "" : "s"}`}
      </p>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <form method="get" style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="key" value={key} />
            <input
              type="text"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="Search name, phone, email, or city"
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 13, width: 260 }}
            />
            <button type="submit" style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Search
            </button>
          </form>
          {filterActive && (
            <Link href={`/admin/customers/list?${keyQS}`} style={{ fontSize: 13, color: "var(--sio-muted)", textDecoration: "none" }}>
              Clear all filters
            </Link>
          )}
        </div>

        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>No customers match these filters.</p>
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
                color: "var(--sio-muted)",
                borderBottom: "1px solid var(--sio-cream)",
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
            {filtered.map((s) => (
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
                  borderBottom: "1px solid var(--sio-cream)",
                  textDecoration: "none",
                  color: "var(--sio-ink)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span>{s.phone}</span>
                <span style={{ color: "var(--sio-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email || "—"}</span>
                <span style={{ color: "var(--sio-muted)" }}>{s.city || "—"}</span>
                <span style={{ color: "var(--sio-muted)" }}>{new Date(s.createdAt).toLocaleDateString("en-IN")}</span>
                <span style={{ color: "var(--sio-muted)" }}>{reservationCountByPhone.get(s.phone) ?? 0}</span>
                <span style={{ color: (visitCountByPhone.get(s.phone) ?? 0) > 0 ? "var(--sio-success)" : "var(--sio-muted)", fontWeight: 600 }}>{visitCountByPhone.get(s.phone) ?? 0}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

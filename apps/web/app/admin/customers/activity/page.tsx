import Link from "next/link";
import { getAllShoppers, getAllReservations } from "../../../../lib/seed-data";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  fulfilled: { bg: "#f0fdf4", color: "#16a34a", label: "Visited" },
  pending: { bg: "#eff6ff", color: "#1d4ed8", label: "Pending" },
  expired: { bg: "#fef2f2", color: "#b91c1c", label: "No-show" },
  cancelled: { bg: "#f8fafc", color: "#64748b", label: "Cancelled" },
};

// Dedicated reservation activity page, split out of /admin/customers (the
// overview dashboard) so a stat tile like "Store visits" or "No-show rate"
// navigates somewhere real instead of just scrolling the same page.
export default async function AdminCustomerActivityPage({ searchParams }: { searchParams: { key?: string; status?: string } }) {
  const key = searchParams.key ?? "";
  const keyQS = `key=${encodeURIComponent(key)}`;
  const statusFilter = searchParams.status;

  const [shoppers, reservations] = await Promise.all([getAllShoppers(), getAllReservations()]);
  const shopperIdByPhone = new Map(shoppers.map((s) => [s.phone, s.id]));

  const feed = statusFilter ? reservations.filter((r) => r.status === statusFilter) : reservations;
  const filterLabel = statusFilter ? STATUS_STYLE[statusFilter]?.label ?? statusFilter : null;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link href={`/admin/customers?${keyQS}`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
        ← Customers &amp; Footfall
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>{filterLabel ? `Activity — ${filterLabel}` : "All activity"}</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        {feed.length} reservation{feed.length === 1 ? "" : "s"}
        {statusFilter && (
          <>
            {" · "}
            <Link href={`/admin/customers/activity?${keyQS}`} style={{ color: "#64748b" }}>
              clear filter
            </Link>
          </>
        )}
      </p>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
        {feed.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>{statusFilter ? "No reservations match this filter." : "No reservations yet."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {feed.map((r) => {
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
    </main>
  );
}

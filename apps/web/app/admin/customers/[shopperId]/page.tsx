import Link from "next/link";
import { notFound } from "next/navigation";
import { getShopperById, getShopperReservations } from "../../../../lib/seed-data";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  fulfilled: { bg: "#f0fdf4", color: "#16a34a", label: "Visited (fulfilled)" },
  pending: { bg: "#eff6ff", color: "#1d4ed8", label: "Pending pickup" },
  expired: { bg: "#fef2f2", color: "#b91c1c", label: "No-show (expired)" },
  cancelled: { bg: "#f8fafc", color: "#64748b", label: "Cancelled" },
};

export default async function AdminCustomerDetailPage({ params, searchParams }: { params: { shopperId: string }; searchParams: { key?: string } }) {
  const key = searchParams.key ?? "";
  const keyQS = `key=${encodeURIComponent(key)}`;

  const shopper = await getShopperById(params.shopperId);
  if (!shopper) notFound();

  const reservations = await getShopperReservations(shopper.phone);
  const fulfilled = reservations.filter((r) => r.status === "fulfilled").length;
  const expired = reservations.filter((r) => r.status === "expired").length;
  const resolved = fulfilled + expired;

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 20px 60px" }}>
      <Link href={`/admin/customers?${keyQS}`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
        ← All customers
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px" }}>{shopper.name}</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        Customer since {new Date(shopper.createdAt).toLocaleDateString("en-IN")}
      </p>

      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Field label="Phone" value={shopper.phone} />
        <Field label="Email" value={shopper.email || "not provided"} />
        <Field label="City" value={shopper.city || "not provided"} />
        <Field label="Pincode" value={shopper.pincode || "not provided"} />
        <Field label="Preferred category" value={shopper.preferredCategory || "not set"} />
        <Field label="Date of birth" value={shopper.dateOfBirth || "not provided"} />
        <Field label="Marketing opt-in" value={shopper.marketingOptIn ? "Yes" : "No"} />
        <Field label="Referral code" value={shopper.referralCode || "—"} />
        <Field label="Signed up via referral" value={shopper.referredBy ? "Yes" : "No"} />
        <Field label="Google sign-in linked" value={shopper.googleId ? "Yes" : "No"} />
      </dl>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatTile value={reservations.length} label="Reservations made" />
        <StatTile value={fulfilled} label="Store visits" />
        <StatTile value={resolved > 0 ? `${Math.round((expired / resolved) * 100)}%` : "—"} label="No-show rate" />
      </div>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Reservation history</h2>
        {reservations.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>No reservations yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reservations.map((r) => {
              const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.cancelled;
              return (
                <div key={r.id} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.storeName}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        Booked {new Date(r.createdAt).toLocaleString("en-IN")}
                        {r.fulfilledAt && ` · Picked up ${new Date(r.fulfilledAt).toLocaleString("en-IN")}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: style.bg, color: style.color }}>{style.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569" }}>
                    {r.items.map((item, i) => (
                      <span key={i}>
                        {item.quantity}× {item.title} ({item.size})
                        {i < r.items.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>₹{r.total.toLocaleString("en-IN")}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{value}</dd>
    </div>
  );
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

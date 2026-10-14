import { getStoresPendingReview } from "../../../lib/seed-data";

// Pilot-only manual seller review queue - the site owner looks over the
// GSTIN/PAN/UPI a seller typed in during onboarding (never verified by any
// real KYC provider, see app/seller/(dashboard)/onboarding/page.tsx) and
// decides whether to activate the store. Reached as
// /admin/sellers?key=<ADMIN_SECRET> - middleware.ts rejects anything else
// with a 403 before this component ever runs, so by the time we're here
// the key (still needed below to carry forward into the Approve/Reject
// form actions) has already been validated.
export default async function AdminSellersPage({ searchParams }: { searchParams: { key?: string } }) {
  const key = searchParams.key ?? "";
  const stores = await getStoresPendingReview();

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Seller review queue</h1>
        <nav style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <a href={`/admin/sellers/active?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a" }}>
            Active sellers (hold/reinstate)
          </a>
          <a href={`/admin/products?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a" }}>
            Product moderation
          </a>
        </nav>
      </div>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        {stores.length === 0 ? "No stores waiting on review." : `${stores.length} store${stores.length === 1 ? "" : "s"} waiting on review.`}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {stores.map((s) => (
          <div key={s.id} className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>
                  <a href={`/admin/sellers/${s.id}?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                    {s.name}
                  </a>
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  {s.city} &middot; {s.localMarket} &middot; {s.pincode}
                </p>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
                <div>Signed up: {s.createdAt ? new Date(s.createdAt).toLocaleString("en-IN") : "unknown"}</div>
                <div>Submitted: {s.submittedForReviewAt ? new Date(s.submittedForReviewAt).toLocaleString("en-IN") : "unknown"}</div>
              </div>
            </div>

            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: "16px 0", fontSize: 13 }}>
              <Field label="Owner phone" value={s.phone || "not provided"} />
              <Field label="GSTIN" value={s.gstin || "not provided"} />
              <Field label="PAN" value={s.pan || "not provided"} />
              <Field label="UPI VPA" value={s.upiVpa || "not provided"} />
            </dl>

            <div style={{ display: "flex", gap: 10 }}>
              <form action={`/api/v1/admin/sellers/${s.id}/approve?key=${encodeURIComponent(key)}&redirect=1`} method="post">
                <button
                  type="submit"
                  style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Approve &amp; activate
                </button>
              </form>
              <form action={`/api/v1/admin/sellers/${s.id}/reject?key=${encodeURIComponent(key)}&redirect=1`} method="post">
                <button
                  type="submit"
                  style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Reject (back to draft)
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
    </div>
  );
}

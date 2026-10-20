import { getActiveStores, getSuspendedStores, getClosedStores } from "../../../../lib/seed-data";

// Pilot-only seller account hold/reinstate tool - the counterpart to
// /admin/sellers (the signup review queue) for a store that's ALREADY
// active: a shopper complaint or a policy violation found after approval
// can put it on hold without needing to touch the signup queue at all.
// Reached as /admin/sellers/active?key=<ADMIN_SECRET> - same shared-secret
// gate as the rest of /admin/** (see lib/admin-auth.ts, middleware.ts,
// which rejects anything under /admin with a 403 before this component
// ever runs).
export default async function AdminActiveSellersPage({ searchParams }: { searchParams: { key?: string } }) {
  const key = searchParams.key ?? "";
  const [activeStores, suspendedStores, closedStores] = await Promise.all([getActiveStores(), getSuspendedStores(), getClosedStores()]);

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Active sellers</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        Put a store on hold to immediately pull it (and everything it lists) out of shopper-facing search, browsing, and reservations, without deleting
        anything. Reinstating it restores full visibility.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        {activeStores.length === 0 ? "No active stores." : `${activeStores.length} active store${activeStores.length === 1 ? "" : "s"}`}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {activeStores.map((s) => (
          <div
            key={s.id}
            className="sio-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 18 }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                <a href={`/admin/sellers/${s.id}?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                  {s.name}
                </a>
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {s.city} &middot; {s.phone || "no phone on file"}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Activated: {s.activatedAt ? new Date(s.activatedAt).toLocaleString("en-IN") : "unknown"}
              </div>
            </div>
            <form action={`/api/v1/admin/sellers/${s.id}/suspend?key=${encodeURIComponent(key)}&redirect=1`} method="post">
              <button
                type="submit"
                style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid #fecdd3", background: "#fff", color: "#e11d48", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Put on hold
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        {suspendedStores.length === 0 ? "No suspended stores." : `${suspendedStores.length} suspended store${suspendedStores.length === 1 ? "" : "s"}`}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {suspendedStores.map((s) => (
          <div
            key={s.id}
            className="sio-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#fef2f2", borderRadius: 14, border: "1px solid #fecdd3", padding: 18 }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                <a href={`/admin/sellers/${s.id}?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                  {s.name}
                </a>
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {s.city} &middot; {s.phone || "no phone on file"}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>On hold - hidden from shoppers platform-wide.</div>
            </div>
            <form action={`/api/v1/admin/sellers/${s.id}/reinstate?key=${encodeURIComponent(key)}&redirect=1`} method="post">
              <button
                type="submit"
                style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Reinstate
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 32 }}>
        {closedStores.length === 0 ? "No closed stores." : `${closedStores.length} closed store${closedStores.length === 1 ? "" : "s"}`}
      </h2>
      <p style={{ color: "#94a3b8", marginBottom: 12, fontSize: 13 }}>
        Closed by the seller themselves (Billing &gt; Danger Zone), not by a hold - reopening is a deliberate admin action, not something the
        seller can undo on their own.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {closedStores.map((s) => (
          <div
            key={s.id}
            className="sio-card"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", padding: 18 }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                <a href={`/admin/sellers/${s.id}?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                  {s.name}
                </a>
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {s.city} &middot; {s.phone || "no phone on file"}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Closed by the seller - hidden from shoppers platform-wide.</div>
            </div>
            <form action={`/api/v1/admin/sellers/${s.id}/reactivate?key=${encodeURIComponent(key)}&redirect=1`} method="post">
              <button
                type="submit"
                style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Reactivate
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}

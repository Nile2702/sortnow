import { getAllStores, getSubscription, getProductCountsForStore, getStoreAnalytics, PLANS } from "../../../../lib/seed-data";

// Consolidated read-only seller detail view - the site owner, looking at
// /admin/sellers/active, wanted to click a store and see its plan, product
// counts, and a short footfall summary in one place instead of having none
// of that visible from the admin side at all (it previously only existed on
// the seller's own dashboard, see app/seller/(dashboard)/analytics). Reached
// as /admin/sellers/<storeId>?key=<ADMIN_SECRET> - same shared-secret gate
// as the rest of /admin/** (see lib/admin-auth.ts, middleware.ts, which
// rejects anything under /admin with a 403 before this component ever
// runs). `storeId` is matched against either the store's id or its slug,
// same lookup convention as the approve/reject/suspend/reinstate API routes
// (app/api/v1/admin/sellers/[storeId]/**), so a bookmarked slug-based link
// keeps working even though every link this codebase generates uses the id.
export default async function AdminSellerDetailPage({
  params,
  searchParams,
}: {
  params: { storeId: string };
  searchParams: { key?: string };
}) {
  const key = searchParams.key ?? "";
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === params.storeId || s.slug === params.storeId);

  if (!store) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
        <p style={{ color: "#64748b" }}>No store matches &ldquo;{params.storeId}&rdquo;.</p>
        <a href={`/admin/sellers/active?key=${encodeURIComponent(key)}`} style={{ color: "#0f172a" }}>
          &larr; Back to active sellers
        </a>
      </main>
    );
  }

  const [subscription, productCounts, analytics] = await Promise.all([
    getSubscription(store.id),
    getProductCountsForStore(store.id),
    getStoreAnalytics(store.id),
  ]);
  const plan = PLANS.find((p) => p.code === subscription.planCode);

  // Simple up/down/flat readout for the 7-day page-view trend: the older
  // half (days 1-3 of the 7, i.e. indices 0-2) vs. the most recent half
  // (indices 4-6), leaving the middle day out of both sides rather than
  // picking an arbitrary tiebreaker for it. +/-10% is treated as noise
  // ("Flat") rather than a real trend given how few events the pilot
  // typically has.
  const last7 = analytics.last7Days;
  const olderSum = last7.slice(0, 3).reduce((sum, d) => sum + d.count, 0);
  const recentSum = last7.slice(4, 7).reduce((sum, d) => sum + d.count, 0);
  const trend = recentSum > olderSum * 1.1 ? "Up" : recentSum < olderSum * 0.9 ? "Down" : "Flat";
  const trendArrow = trend === "Up" ? "↑" : trend === "Down" ? "↓" : "→";
  const trendColor = trend === "Up" ? "#16a34a" : trend === "Down" ? "#dc2626" : "#64748b";

  const keyQS = `?key=${encodeURIComponent(key)}`;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{store.name}</h1>
        <nav style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <a href={`/admin/sellers/active${keyQS}`} style={{ color: "#0f172a" }}>
            &larr; Active sellers
          </a>
          <a href={`/admin/sellers${keyQS}`} style={{ color: "#0f172a" }}>
            Signup review queue
          </a>
          <a href={`/admin/products${keyQS}`} style={{ color: "#0f172a" }}>
            Product moderation
          </a>
        </nav>
      </div>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        Consolidated view for the site owner - plan, listings, and a short footfall summary in one place. Use{" "}
        <a href={`/admin/sellers/active${keyQS}`} style={{ color: "inherit" }}>
          Active sellers
        </a>{" "}
        to put this store on hold or reinstate it.
      </p>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Store</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: 0, fontSize: 13 }}>
          <Field label="Status" value={store.status} />
          <Field label="City / market" value={`${store.city}${store.localMarket ? ` · ${store.localMarket}` : ""}`} />
          <Field label="Phone" value={store.phone || "not provided"} />
          <Field label="GSTIN" value={store.gstin || "not provided"} />
          <Field label="PAN" value={store.pan || "not provided"} />
          <Field label="UPI VPA" value={store.upiVpa || "not provided"} />
          <Field label="Signed up" value={store.createdAt ? new Date(store.createdAt).toLocaleString("en-IN") : "unknown"} />
          <Field label="Activated" value={store.activatedAt ? new Date(store.activatedAt).toLocaleString("en-IN") : "never"} />
        </dl>
      </section>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Subscription &amp; listings</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <StatTile value={plan ? plan.name : subscription.planCode} label={`Plan (₹${plan?.monthlyPrice ?? "?"}/mo, up to ${plan?.skuLimit ?? "?"} SKUs)`} />
          <StatTile value={productCounts.total} label="Products listed" />
          <StatTile value={productCounts.live} label="Live" color="#16a34a" />
          <StatTile value={productCounts.onHold} label="On hold" color={productCounts.onHold > 0 ? "#b45309" : undefined} />
        </div>
      </section>

      <section className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Footfall summary</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
          Short summary only - see the seller&apos;s own Analytics tab for the full chart suite.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 14 }}>
          <StatTile value={analytics.totalPageViews} label="Total page views" />
          <StatTile value={analytics.totalQrScans} label="Total QR scans" />
          <StatTile value={analytics.onlineViews} label="Online discovery" />
          <StatTile value={`${trendArrow} ${trend}`} label="7-day trend" color={trendColor} />
        </div>
        {Object.keys(analytics.byPosition).length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              QR scans by placement
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(analytics.byPosition).map(([pos, count]) => (
                <span
                  key={pos}
                  style={{ fontSize: 12, background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 999, padding: "4px 12px" }}
                >
                  {pos}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </>
        )}
      </section>
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

function StatTile({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9", padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
    </div>
  );
}

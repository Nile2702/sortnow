import { redirect } from "next/navigation";
import { SellerNav } from "../../../components/SellerNav";
import { getSellerSession } from "../../../lib/auth/require-seller";
import { getAllStores } from "../../../lib/seed-data";

// Only the dashboard home page's "Store Status" stat tile told a seller
// whether their store was pending_review/suspended - every one of the other
// 10 tabs (Products, Reservations, Sales, etc.) gave zero indication,
// so a suspended seller could freely keep adding products/running sales
// with no warning their store isn't actually visible to shoppers. This
// banner shows on every tab instead, at the layout level.
const STATUS_BANNER: Record<string, { bg: string; fg: string; text: string }> = {
  pending_review: { bg: "#fef9c3", fg: "#854d0e", text: "Your store is pending review - it isn't visible to shoppers yet. We'll let you know once it's approved." },
  suspended: { bg: "#fee2e2", fg: "#991b1b", text: "Your store is currently suspended and isn't visible to shoppers. Contact support if you have questions." },
  draft: { bg: "#f1f5f9", fg: "#475569", text: "Your store hasn't been submitted for review yet - finish onboarding to go live." },
  closed: { bg: "#f1f5f9", fg: "#475569", text: "Your store is closed and isn't visible to shoppers." },
};

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = getSellerSession();
  if (!session) redirect("/seller/login");

  const stores = await getAllStores();
  const store = stores.find((s) => s.id === session.storeId);
  const banner = store ? STATUS_BANNER[store.status] : undefined;

  return (
    <div style={{ background: "#f7f7fb", minHeight: "60vh" }}>
      <SellerNav />
      {banner && (
        <div style={{ background: banner.bg, color: banner.fg, textAlign: "center", padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>
          {banner.text}
        </div>
      )}
      {children}
    </div>
  );
}

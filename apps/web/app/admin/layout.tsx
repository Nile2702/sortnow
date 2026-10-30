import { Suspense } from "react";
import { AdminNav } from "../../components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--sio-cream)", minHeight: "60vh" }}>
      {/* AdminNav reads ?key= via useSearchParams(), which bails every
          page under this layout out of static generation unless it's
          wrapped in its own Suspense boundary - these pages are already
          all dynamic (server components reading searchParams themselves),
          so the empty fallback is never actually seen in practice. */}
      <Suspense fallback={<div style={{ background: "var(--sio-ink)", height: 62 }} />}>
        <AdminNav />
      </Suspense>
      {children}
    </div>
  );
}

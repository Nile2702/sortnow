import { AdminNav } from "../../components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--sio-cream)", minHeight: "60vh" }}>
      <AdminNav />
      {children}
    </div>
  );
}

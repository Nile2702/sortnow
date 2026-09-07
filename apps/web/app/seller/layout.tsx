import { SellerNav } from "../../components/SellerNav";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f7f7fb", minHeight: "60vh" }}>
      <SellerNav />
      {children}
    </div>
  );
}

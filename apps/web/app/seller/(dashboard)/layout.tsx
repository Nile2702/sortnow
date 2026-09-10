import { redirect } from "next/navigation";
import { SellerNav } from "../../../components/SellerNav";
import { getSellerSession } from "../../../lib/auth/require-seller";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  if (!getSellerSession()) redirect("/seller/login");

  return (
    <div style={{ background: "#f7f7fb", minHeight: "60vh" }}>
      <SellerNav />
      {children}
    </div>
  );
}

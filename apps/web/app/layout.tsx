import { SiteHeader } from "../components/SiteHeader";

export const metadata = {
  title: "SORT IT OUT — Find fashion near you",
  description: "Discover apparel from stores near you, sort by what matters, shop online or in-store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <div style={{ borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
          <SiteHeader />
        </div>
        {children}
      </body>
    </html>
  );
}

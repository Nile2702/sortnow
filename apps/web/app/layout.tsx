import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";

const heading = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--site-font-heading" });
const body = Inter({ subsets: ["latin"], variable: "--site-font-body" });

export const metadata = {
  title: "SORT IT OUT — Find fashion near you",
  description: "Discover apparel from stores near you, sort by what matters, shop online or in-store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--site-font-body), system-ui, sans-serif",
          background: "#f7f7fb",
          color: "#0f172a",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SiteHeader />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}

import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";
import { Footer } from "../components/Footer";
import { CursorGlow } from "../components/CursorGlow";
import { ScrollRevealInit } from "../components/ScrollRevealInit";
import { ToastHost } from "../components/ToastHost";

// A rounded, friendly sans-serif for headings instead of the earlier
// Cormorant Garamond serif - the serif read as a formal fashion-magazine
// "classic boutique" look; this keeps things approachable while staying
// distinct from the Inter body text.
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--site-font-heading" });
const body = Inter({ subsets: ["latin"], variable: "--site-font-body" });

export const metadata = {
  title: "SORT IT OUT — Find fashion near you",
  description: "Discover apparel from stores near you, sort by what matters, and walk into the store to try it on or buy.",
  metadataBase: new URL("https://sortitout.in"),
  openGraph: {
    title: "SORT IT OUT — Find fashion near you",
    description: "Discover apparel from stores near you, sort by what matters, and walk into the store to try it on or buy.",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#16140f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--site-font-body), system-ui, sans-serif",
          background: "var(--sio-cream)",
          color: "var(--sio-ink)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CursorGlow />
        <ScrollRevealInit />
        <ToastHost />
        <SiteHeader />
        <div style={{ flex: 1, position: "relative" }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}

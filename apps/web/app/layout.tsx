import { Figtree } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";
import { MobileAppHeader } from "../components/MobileAppHeader";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { Footer } from "../components/Footer";
import { CursorGlow } from "../components/CursorGlow";
import { ScrollRevealInit } from "../components/ScrollRevealInit";
import { ScrollToTop } from "../components/ScrollToTop";
import { ToastHost } from "../components/ToastHost";
import { LocationGate } from "../components/LocationGate";

// Figtree - the same typeface Myntra's own site uses, for both headings and
// body text (a single-family system rather than a heading/body pairing).
const heading = Figtree({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--site-font-heading" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--site-font-body" });

export const metadata = {
  title: "SORT NOW — Find fashion near you",
  description: "Discover apparel from stores near you, sort by what matters, and walk into the store to try it on or buy.",
  metadataBase: new URL("https://sortitout.in"),
  openGraph: {
    title: "SORT NOW — Find fashion near you",
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
        <ScrollToTop />
        <ScrollRevealInit />
        <ToastHost />
        <LocationGate />
        <SiteHeader />
        <MobileAppHeader />
        <div style={{ flex: 1, position: "relative" }}>{children}</div>
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}

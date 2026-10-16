import { Poppins, Playfair_Display } from "next/font/google";
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
import { ServiceWorkerRegister } from "../components/ServiceWorkerRegister";
import { SITE_URL } from "../lib/site-url";

// Poppins - a bold, geometric sans matching the weight/feel of the brand
// logo's wordmark, used for both headings and body text.
const heading = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--site-font-heading" });
const body = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--site-font-body" });
// A single elegant italic serif word dropped into an otherwise bold
// sans-serif headline (the homepage hero, the category-tiles section
// heading) - the same mixed-typography accent pattern used widely across
// premium DTC sites, picked at the user's request after referencing one.
const accent = Playfair_Display({ subsets: ["latin"], weight: ["600"], style: ["italic"], variable: "--site-font-accent" });

export const metadata = {
  title: "SORT NOW — Find fashion near you",
  description: "Discover apparel from stores near you, sort by what matters, and walk into the store to try it on or buy.",
  metadataBase: new URL(SITE_URL),
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
    <html lang="en" className={`${heading.variable} ${body.variable} ${accent.variable}`}>
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
        <ServiceWorkerRegister />
        <SiteHeader />
        <MobileAppHeader />
        <div style={{ flex: 1, position: "relative" }}>{children}</div>
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}

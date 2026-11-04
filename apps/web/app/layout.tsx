import { Outfit, Fraunces } from "next/font/google";
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

// Outfit - a clean modern grotesque, used for both headings and body text.
const heading = Outfit({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--site-font-heading" });
const body = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--site-font-body" });
// An editorial soft-serif (less common than Playfair Display, same
// "elegant accent word" job) dropped into an otherwise clean sans-serif
// headline (the homepage hero, the category-tiles section heading) - the
// same mixed-typography accent pattern used widely across premium DTC
// sites, picked at the user's request after referencing one.
const accent = Fraunces({ subsets: ["latin"], weight: ["600"], style: ["italic"], variable: "--site-font-accent" });

const SITE_DESCRIPTION =
  "SORT NOW helps you discover fashion from real local boutiques near you by PIN code — browse Men, Women & Kids apparel, filter by size and price, reserve items online, and try them on in-store before you buy. No online payment needed.";

export const metadata = {
  title: "SORT NOW — Find fashion near you",
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  // No canonical/authoritative-host concern on the homepage itself - every
  // tenant-subdomain/custom-domain rewrite in middleware.ts still resolves
  // to this exact root path, so metadataBase alone already makes "/" always
  // point at the real sortnow.in domain, no explicit `alternates` needed
  // here (unlike /store/[slug] and /product/[productId], which a seller's
  // own subdomain also serves - see those pages' own canonical tags).
  openGraph: {
    title: "SORT NOW — Find fashion near you",
    description: SITE_DESCRIPTION,
    type: "website",
  },
  // No image is configured here (opengraph-image/twitter-image convention
  // files don't exist in this app yet - a real branded share image is a
  // design task, not something to invent here) - "summary" degrades to a
  // clean text-only card instead of "summary_large_image" silently
  // rendering as a broken/empty image block on X/Twitter.
  twitter: {
    card: "summary",
    title: "SORT NOW — Find fashion near you",
    description: SITE_DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#16140f",
};

// Organization + WebSite structured data (schema.org JSON-LD) for the whole
// site - this is what lets Google show a sitelinks search box under the
// site's main result (via WebSite.potentialAction/SearchAction) and attach
// the brand logo/name to knowledge-panel-style results (via Organization).
// Rendered as a plain <script> below rather than via next/head - the App
// Router manages <head> itself (see the `metadata` export above), and
// Google's own JSON-LD guidance explicitly supports the script living
// anywhere in the document, <body> included.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SORT NOW",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo.png`,
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SORT NOW",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
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

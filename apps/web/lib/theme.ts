import { cache } from "react";
import { stores, themes } from "./seed-data";

export interface ThemeConfig {
  version: number;
  brand: {
    logoUrl?: string;
    faviconUrl?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      saleBadge?: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      baseSizePx?: number;
    };
    borderRadiusScale?: "sharp" | "soft" | "pill";
  };
  layout: {
    gridStyle: "2-col" | "3-col" | "4-col" | "list";
    sectionOrder: string[];
    heroCarousel?: Array<{ eyebrow?: string; title: string; subtitle?: string; ctaLabel?: string; ctaLink?: string }>;
    featuredCollection?: { title?: string; categoryId?: string; maxItems?: number };
  };
  locale?: { defaultLocale?: string; supportedLocales?: string[] };
}

export interface StoreRecord {
  id: string;
  slug: string;
  name: string;
  status: string;
  liveSale?: { headline: string; discountLabel: string; startedAt: string; endsAt: string } | null;
}

/**
 * Reads straight from the in-process store list (see lib/seed-data.ts)
 * rather than making an HTTP round-trip to this app's own API route.
 * Self-fetching your own deployment from a server component is a known
 * trap on serverless hosts (Vercel) - the request can come back as an HTML
 * auth/redirect page instead of JSON (failing `res.json()` with a cryptic
 * "Unexpected token '<'" instead of the real 404/null), and even when it
 * works it's a needless network hop for data that's already in the same
 * process. Wrapped in React `cache()` so multiple calls within one render
 * still dedupe to a single lookup.
 */
export const getStoreBySlug = cache(async (slug: string): Promise<StoreRecord | null> => {
  return stores.find((s) => s.slug === slug || s.id === slug) ?? null;
});

export const getLiveTheme = cache(async (storeId: string): Promise<ThemeConfig> => {
  return themes[storeId] ?? DEFAULT_THEME;
});

/**
 * Maps a store's theme to a narrow accent-only set of CSS custom properties.
 * The platform's fonts, spacing, card style, and header/footer are uniform
 * across every page (site-wide design system) - a store's theme only tints
 * its own hero background and CTA/accent touches, so stores stay visually
 * distinguishable without turning into a completely different-looking site.
 */
export function themeToCssVariables(theme: ThemeConfig): string {
  const { colors } = theme.brand;
  return `
    :root {
      --store-primary: ${colors.primary};
      --store-accent: ${colors.accent};
    }
  `.trim();
}

const DEFAULT_THEME: ThemeConfig = {
  version: 0,
  brand: {
    colors: { primary: "#111827", secondary: "#f3f4f6", accent: "#2563eb", background: "#ffffff", text: "#111827" },
    typography: { headingFont: "Inter", bodyFont: "Inter", baseSizePx: 16 },
    borderRadiusScale: "soft",
  },
  layout: { gridStyle: "3-col", sectionOrder: ["hero", "featuredCollection", "categoryNav", "newArrivals"] },
};

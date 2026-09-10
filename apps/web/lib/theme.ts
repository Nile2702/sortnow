import { cache } from "react";

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
  photoUrl?: string;
}

/**
 * Server-side fetch, deduped per-request via React `cache()`.
 * The Tenant Service itself reads-through Redis (theme:{store_id}, 10 min TTL)
 * so this call is cheap even under load; ISR at the page level adds a second
 * layer of caching for anonymous traffic.
 */
export const getStoreBySlug = cache(async (slug: string): Promise<StoreRecord | null> => {
  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/stores/${slug}`, {
    next: { revalidate: 60, tags: [`store:${slug}`] },
  });
  if (!res.ok) return null;
  return res.json();
});

export const getLiveTheme = cache(async (storeId: string): Promise<ThemeConfig> => {
  const res = await fetch(`${process.env.INTERNAL_API_URL}/v1/stores/${storeId}/theme?status=live`, {
    next: { revalidate: 600, tags: [`theme:${storeId}`] },
  });
  if (!res.ok) return DEFAULT_THEME;
  return res.json();
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

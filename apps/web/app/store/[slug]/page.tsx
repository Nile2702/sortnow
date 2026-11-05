import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStoreBySlug, getLiveTheme, themeToCssVariables } from "../../../lib/theme";
import { SITE_URL } from "../../../lib/site-url";
import { getStoreRatingSummary, getAllCategories } from "../../../lib/seed-data";
import { HeroCarousel } from "../../../components/HeroCarousel";
import { ProductGrid } from "../../../components/ProductGrid";
import { CategoryNav } from "../../../components/CategoryNav";
import { TrackPageView } from "../../../components/TrackPageView";
import { StoreRatingBadge } from "../../../components/StoreRatingBadge";
import { PinIcon, PhoneIcon } from "../../../components/icons";
import { StoreReviews } from "../../../components/StoreReviews";

interface Props {
  params: { slug: string };
  searchParams: { category?: string };
}

// ISR: anonymous storefront pages revalidate every 60s, busted early via
// revalidateTag(`store:${slug}`) / (`theme:${storeId}`) on Theme Studio publish.
export const revalidate = 60;

export default async function StorefrontPage({ params, searchParams }: Props) {
  const store = await getStoreBySlug(params.slug);
  if (!store || store.status !== "active") notFound();
  // A category pill under the hero (components/CategoryNav.tsx) links to
  // ?category=<id> - this is the one place that reads it, to actually filter
  // the grid instead of the pill just reloading the same unfiltered page.
  const activeCategoryId = searchParams.category;

  const theme = await getLiveTheme(store.id);
  const css = themeToCssVariables(theme);
  const saleActive = !!store.liveSale && new Date(store.liveSale.endsAt).getTime() > Date.now();
  const rating = await getStoreRatingSummary(store.id);

  // Store + BreadcrumbList structured data (schema.org JSON-LD). This page
  // is already a server component with generateMetadata below, so (unlike
  // /product/[productId]) there's no separate layout.tsx needed - the data
  // this needs (store, rating) is already fetched above.
  const storeUrl = `${SITE_URL}/store/${store.slug}`;
  const storeJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    url: storeUrl,
    address: { "@type": "PostalAddress", addressLocality: store.city, addressRegion: store.localMarket },
  };
  // Same zero-review omission rule as the product page - never claim a
  // rating that doesn't exist.
  if (rating.count > 0) {
    storeJsonLd.aggregateRating = { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count };
  }
  const storeBreadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: store.name, item: storeUrl },
    ],
  };

  // When a category pill is active, replace the normal section layout with
  // one focused grid for that category instead of mixing a filtered view in
  // with an unrelated "New Arrivals" section below it.
  let activeCategoryName: string | undefined;
  if (activeCategoryId) {
    const categories = await getAllCategories();
    activeCategoryName = categories[store.id]?.find((c: any) => c.id === activeCategoryId)?.name;
  }

  // Every section in sectionOrder maps to a shared component - the same
  // components and design system the homepage uses. Only the store's
  // primary/accent color (--store-primary / --store-accent, injected below)
  // differs per tenant, not the fonts, spacing, or layout.
  const sectionComponents: Record<string, JSX.Element | null> = {
    hero: theme.layout.heroCarousel ? <HeroCarousel slides={theme.layout.heroCarousel} /> : null,
    categoryNav: <CategoryNav storeId={store.id} activeCategoryId={activeCategoryId} />,
    featuredCollection: activeCategoryId ? (
      <ProductGrid storeId={store.id} gridStyle={theme.layout.gridStyle} title={activeCategoryName ?? "Category"} categoryId={activeCategoryId} limit={48} />
    ) : (
      <ProductGrid
        storeId={store.id}
        gridStyle={theme.layout.gridStyle}
        title={theme.layout.featuredCollection?.title ?? "Featured"}
        categoryId={theme.layout.featuredCollection?.categoryId}
        limit={theme.layout.featuredCollection?.maxItems ?? 8}
      />
    ),
    newArrivals: activeCategoryId ? null : <ProductGrid storeId={store.id} gridStyle={theme.layout.gridStyle} title="New Arrivals" sort="newest" />,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeBreadcrumbJsonLd) }} />
      {/* Only sets --store-primary / --store-accent - see lib/theme.ts */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Suspense fallback={null}>
        <TrackPageView storeSlug={store.slug} />
      </Suspense>
      <main>
        {saleActive && store.liveSale && (
          <div
            style={{
              background: "var(--sio-error)",
              color: "#fff",
              textAlign: "center",
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            <span className="sio-breathe" style={{ display: "inline-block", marginRight: 8 }}>●</span>
            LIVE SALE — {store.liveSale.headline} · {store.liveSale.discountLabel}
          </div>
        )}
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "12px 16px 0" }}>
          <StoreRatingBadge average={rating.average} count={rating.count} />
        </div>
        {theme.layout.sectionOrder.map((key, i) =>
          key === "hero" ? (
            <div key={key} data-section={key} style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 16px 0" }}>
              {sectionComponents[key]}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 14px",
                  marginTop: 14,
                  fontSize: 13,
                  color: "var(--sio-muted)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <PinIcon size={13} /> {store.localMarket}, {store.city} – {store.pincode}
                </span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--store-primary, var(--sio-ink))", fontWeight: 600, textDecoration: "none" }}
                >
                  Locate on map →
                </a>
                {store.phone && (
                  <a
                    href={`tel:+91${store.phone}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--store-primary, var(--sio-ink))", fontWeight: 600, textDecoration: "none" }}
                  >
                    <PhoneIcon size={13} /> Call store
                  </a>
                )}
              </div>
            </div>
          ) : (
            <section key={key} data-section={key}>
              {sectionComponents[key] ?? null}
            </section>
          )
        )}
        <StoreReviews storeId={store.id} />
      </main>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const store = await getStoreBySlug(params.slug);
  if (!store) return {};
  const url = `${SITE_URL}/store/${store.slug}`;
  // Without this, every store page fell back to the root layout's one
  // static description/OG tags - so a link to any store shared on
  // WhatsApp or Instagram showed the same generic site-wide preview
  // instead of that store's own name and location.
  const description = `Shop ${store.name} on SORT NOW - a real boutique in ${store.localMarket}, ${store.city}. Browse their collection, reserve online, and try it on in-store before you buy.`;
  return {
    title: store.name,
    description,
    icons: { icon: "/api/store-favicon/" + store.slug },
    // middleware.ts rewrites a seller's own subdomain (and any verified
    // custom domain) to this exact page, so the same storefront is reachable
    // from several different hosts - with nothing telling search engines
    // which one is authoritative, that's duplicate content across hosts.
    // Always pointing the canonical tag at the sortnow.in path-based URL,
    // regardless of which host actually served this request, picks one
    // answer consistently.
    alternates: { canonical: url },
    openGraph: { title: store.name, description, type: "website", url },
    twitter: { card: "summary", title: store.name, description },
  };
}

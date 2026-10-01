import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStoreBySlug, getLiveTheme, themeToCssVariables } from "../../../lib/theme";
import { getStoreRatingSummary } from "../../../lib/seed-data";
import { HeroCarousel } from "../../../components/HeroCarousel";
import { ProductGrid } from "../../../components/ProductGrid";
import { CategoryNav } from "../../../components/CategoryNav";
import { TrackPageView } from "../../../components/TrackPageView";
import { StoreRatingBadge } from "../../../components/StoreRatingBadge";
import { StoreReviews } from "../../../components/StoreReviews";

interface Props {
  params: { slug: string };
}

// ISR: anonymous storefront pages revalidate every 60s, busted early via
// revalidateTag(`store:${slug}`) / (`theme:${storeId}`) on Theme Studio publish.
export const revalidate = 60;

export default async function StorefrontPage({ params }: Props) {
  const store = await getStoreBySlug(params.slug);
  if (!store || store.status !== "active") notFound();

  const theme = await getLiveTheme(store.id);
  const css = themeToCssVariables(theme);
  const saleActive = !!store.liveSale && new Date(store.liveSale.endsAt).getTime() > Date.now();
  const rating = getStoreRatingSummary(store.id);

  // Every section in sectionOrder maps to a shared component - the same
  // components and design system the homepage uses. Only the store's
  // primary/accent color (--store-primary / --store-accent, injected below)
  // differs per tenant, not the fonts, spacing, or layout.
  const sectionComponents: Record<string, JSX.Element | null> = {
    hero: theme.layout.heroCarousel ? <HeroCarousel slides={theme.layout.heroCarousel} /> : null,
    categoryNav: <CategoryNav storeId={store.id} />,
    featuredCollection: (
      <ProductGrid
        storeId={store.id}
        gridStyle={theme.layout.gridStyle}
        title={theme.layout.featuredCollection?.title ?? "Featured"}
        categoryId={theme.layout.featuredCollection?.categoryId}
        limit={theme.layout.featuredCollection?.maxItems ?? 8}
      />
    ),
    newArrivals: <ProductGrid storeId={store.id} gridStyle={theme.layout.gridStyle} title="New Arrivals" sort="newest" />,
  };

  return (
    <>
      {/* Only sets --store-primary / --store-accent - see lib/theme.ts */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Suspense fallback={null}>
        <TrackPageView storeSlug={store.slug} />
      </Suspense>
      <main>
        {saleActive && store.liveSale && (
          <div
            style={{
              background: "#dc2626",
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
        {rating.count > 0 && (
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "12px 16px 0" }}>
            <StoreRatingBadge average={rating.average} count={rating.count} />
          </div>
        )}
        {theme.layout.sectionOrder.map((key, i) =>
          key === "hero" ? (
            <div key={key} data-section={key} style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 16px 0" }}>
              {sectionComponents[key]}
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
  return {
    title: store.name,
    icons: { icon: "/api/store-favicon/" + store.slug },
  };
}

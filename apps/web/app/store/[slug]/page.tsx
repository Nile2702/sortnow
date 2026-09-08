import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getStoreBySlug, getLiveTheme, themeToCssVariables } from "../../../lib/theme";
import { HeroCarousel } from "../../../components/HeroCarousel";
import { ProductGrid } from "../../../components/ProductGrid";
import { CategoryNav } from "../../../components/CategoryNav";
import { TrackPageView } from "../../../components/TrackPageView";

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
        {theme.layout.sectionOrder.map((key, i) =>
          key === "hero" ? (
            <div key={key} data-section={key} style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 0" }}>
              {sectionComponents[key]}
            </div>
          ) : (
            <section key={key} data-section={key}>
              {sectionComponents[key] ?? null}
            </section>
          )
        )}
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

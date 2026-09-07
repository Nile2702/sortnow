import { notFound } from "next/navigation";
import { getStoreBySlug, getLiveTheme, themeToCssVariables } from "../../../lib/theme";
import { HeroCarousel } from "../../../components/HeroCarousel";
import { ProductGrid } from "../../../components/ProductGrid";
import { CategoryNav } from "../../../components/CategoryNav";

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

  // Every section in sectionOrder maps to a shared component - the ONLY thing
  // that differs per tenant is theme.config (colors/fonts/order), never the
  // component code itself.
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
      {/* SSR-injected theme - renders with correct branding on first paint, no client flash */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main
        style={{ background: "var(--sio-color-background)", color: "var(--sio-color-text)", fontFamily: "var(--sio-font-body)" }}
      >
        {theme.layout.sectionOrder.map((key) => (
          <section key={key} data-section={key}>
            {sectionComponents[key] ?? null}
          </section>
        ))}
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

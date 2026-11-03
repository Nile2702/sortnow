import { Metadata } from "next";
import { getAllProducts, getAllStores, getRatingSummary } from "../../../lib/seed-data";
import { SITE_URL } from "../../../lib/site-url";

const GENDER_LABELS: Record<string, string> = { men: "Men", women: "Women", kids: "Kids" };

// The product page itself is a client component (fetches its data via
// useEffect), so generateMetadata can't live there - Next.js only reads it
// from a page.tsx or layout.tsx server component. This layout just adds
// per-product title/description/OG tags around the existing client page.
export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
  const products = await getAllProducts();
  const product = products.find((p) => p.id === params.productId);
  if (!product) return {};
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === product.storeId);
  // Same visibility rule as the public product API/page - don't generate
  // real SEO metadata (title/OG tags) for a held product or one belonging
  // to a non-active store.
  if (product.status === "on_hold" || !store || store.status !== "active") return {};

  const title = `${product.title} — ${store?.name ?? "SORT NOW"}`;
  const description =
    product.description ?? `${product.title} from ${store?.name ?? "a nearby store"}. ₹${product.basePrice} — reserve it to try on in person.`;

  return {
    title,
    description,
    openGraph: { title, description, images: product.images?.[0]?.url ? [product.images[0].url] : undefined },
    // Same duplicate-content reasoning as /store/[slug]'s own canonical tag -
    // a product page is reachable through whichever host its store's own
    // subdomain/custom domain rewrites to, in addition to sortnow.in
    // directly. Always point search engines at the sortnow.in path-based URL.
    alternates: { canonical: `${SITE_URL}/product/${product.id}` },
  };
}

// Same reasoning as generateMetadata above - the product page itself is a
// client component, so this layout is also the only place that can render
// server-side JSON-LD structured data (Product + BreadcrumbList) for it.
// Next.js doesn't share fetched data between generateMetadata and the
// page/layout body, so the product/store/rating lookups below intentionally
// duplicate the ones generateMetadata already does above.
export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: { productId: string } }) {
  const products = await getAllProducts();
  const product = products.find((p) => p.id === params.productId);
  if (!product) return children;
  const stores = await getAllStores();
  const store = stores.find((s) => s.id === product.storeId);
  // Same visibility rule as generateMetadata above - no structured data for a
  // held product or one belonging to a non-active store.
  if (product.status === "on_hold" || !store || store.status !== "active") return children;

  const rating = await getRatingSummary(product.id);
  const productUrl = `${SITE_URL}/product/${product.id}`;

  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images?.map((img) => img.url) ?? [],
    description:
      product.description ?? `${product.title} from ${store.name}. ₹${product.basePrice} — reserve it to try on in person.`,
    sku: product.productCode ?? product.id,
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: product.basePrice,
      availability: product.stockRemaining === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };
  // Never emit a fake/zero rating - omit aggregateRating entirely for a
  // product with no reviews yet instead of claiming "ratingValue: 0".
  if (rating.count > 0) {
    productJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.average,
      reviewCount: rating.count,
    };
  }

  // Mirrors the on-page breadcrumb exactly (see app/product/[productId]/
  // page.tsx's "Home / <gender> / <store> / <title>" trail).
  const genderLabel = GENDER_LABELS[product.gender] ?? product.gender;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: genderLabel, item: `${SITE_URL}/category/${product.gender}` },
      { "@type": "ListItem", position: 3, name: store.name, item: `${SITE_URL}/store/${store.slug}` },
      { "@type": "ListItem", position: 4, name: product.title, item: productUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}

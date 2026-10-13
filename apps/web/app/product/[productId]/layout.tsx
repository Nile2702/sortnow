import { Metadata } from "next";
import { getAllProducts, getAllStores } from "../../../lib/seed-data";

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
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}

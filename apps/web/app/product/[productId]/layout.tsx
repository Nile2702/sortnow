import { Metadata } from "next";
import { products, stores } from "../../../lib/seed-data";

// The product page itself is a client component (fetches its data via
// useEffect), so generateMetadata can't live there - Next.js only reads it
// from a page.tsx or layout.tsx server component. This layout just adds
// per-product title/description/OG tags around the existing client page.
export async function generateMetadata({ params }: { params: { productId: string } }): Promise<Metadata> {
  const product = products.find((p) => p.id === params.productId);
  if (!product) return {};
  const store = stores.find((s) => s.id === product.storeId);

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

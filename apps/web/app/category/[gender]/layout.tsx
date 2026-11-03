import { Metadata } from "next";
import { SITE_URL } from "../../../lib/site-url";

const LABELS: Record<string, string> = { men: "Men", women: "Women", kids: "Kids" };

export async function generateMetadata({ params }: { params: { gender: string } }): Promise<Metadata> {
  const label = LABELS[params.gender] ?? "Fashion";
  return {
    title: `${label}'s Fashion Near You — SORT NOW`,
    description: `Discover ${label.toLowerCase()}'s apparel from stores near you. Sort by price, size, and category, then reserve to try on in person.`,
  };
}

export default function CategoryLayout({ children, params }: { children: React.ReactNode; params: { gender: string } }) {
  const label = LABELS[params.gender] ?? "Fashion";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: label, item: `${SITE_URL}/category/${params.gender}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}

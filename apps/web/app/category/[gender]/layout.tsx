import { Metadata } from "next";

const LABELS: Record<string, string> = { men: "Men", women: "Women", kids: "Kids" };

export async function generateMetadata({ params }: { params: { gender: string } }): Promise<Metadata> {
  const label = LABELS[params.gender] ?? "Fashion";
  return {
    title: `${label}'s Fashion Near You — SORT IT OUT`,
    description: `Discover ${label.toLowerCase()}'s apparel from stores near you. Sort by price, size, and category, then reserve to try on in person.`,
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

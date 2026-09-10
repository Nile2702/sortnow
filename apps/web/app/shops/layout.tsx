import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore All Shops — SORT IT OUT",
  description: "Every boutique and store listed on SORT IT OUT — browse and pick one near you.",
};

export default function ShopsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

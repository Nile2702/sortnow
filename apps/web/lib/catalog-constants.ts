// Pure, dependency-free catalog constants safe to import from client
// components (header nav, homepage filters, the seller product form). Kept
// separate from lib/seed-data.ts because that file now pulls in lib/persist.ts
// (Node's fs/path) for server-side persistence - bundling that for the
// browser fails outright, so anything a client component needs must live
// here instead. seed-data.ts re-exports these so server code can keep
// importing everything from one place.
export type Gender = "men" | "women" | "kids";

export const ALL_SIZES = ["S", "M", "L", "XL", "XXL", "Free Size", "30", "32", "34", "36", "2-3Y", "4-5Y", "6-7Y", "8-9Y"];

// Two-level nav taxonomy: gender (top-level tab) -> subCategory (product-level
// attribute). Mirrors what `product_categories` + a `gender` facet would look
// like as a real per-tenant catalog taxonomy (docs/03-multi-tenant-storefront.md).
export const CATEGORY_TREE: { label: string; value: Gender; subCategories: string[] }[] = [
  { label: "Men", value: "men", subCategories: ["Jeans", "Jackets", "Shirts", "T-Shirts", "Footwear"] },
  { label: "Women", value: "women", subCategories: ["Sarees", "Kurtis", "Lehengas", "Western Wear"] },
  { label: "Kids", value: "kids", subCategories: ["Boys", "Girls", "Infant"] },
];

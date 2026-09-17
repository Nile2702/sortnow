// Pure, dependency-free catalog constants safe to import from client
// components (header nav, homepage filters, the seller product form). Kept
// separate from lib/seed-data.ts because that file now pulls in lib/persist.ts
// (Node's fs/path) for server-side persistence - bundling that for the
// browser fails outright, so anything a client component needs must live
// here instead. seed-data.ts re-exports these so server code can keep
// importing everything from one place.
export type Gender = "men" | "women" | "kids";

export const ALL_SIZES = ["S", "M", "L", "XL", "XXL", "Free Size", "30", "32", "34", "36", "2-3Y", "4-5Y", "6-7Y", "8-9Y"];

// A shared color catalog so a seller can list one product across several
// colors by picking swatches instead of photographing and re-uploading
// every colorway separately - see components/ProductForm.tsx, which creates
// one product per selected color, all sharing the same title/description/
// price/photo except for this attribute.
export const COLOR_CATALOG: { name: string; hex: string }[] = [
  { name: "Black", hex: "#0f172a" },
  { name: "White", hex: "#f8fafc" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Sky Blue", hex: "#38bdf8" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Emerald Green", hex: "#166534" },
  { name: "Olive", hex: "#65752c" },
  { name: "Mustard", hex: "#b45309" },
  { name: "Beige", hex: "#d6c7a1" },
  { name: "Brown", hex: "#7c2d12" },
  { name: "Maroon", hex: "#7a1f3d" },
  { name: "Red", hex: "#dc2626" },
  { name: "Coral", hex: "#f97066" },
  { name: "Peach", hex: "#fdba8c" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Magenta", hex: "#9f1239" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Lavender", hex: "#c4b5fd" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Charcoal", hex: "#374151" },
  { name: "Gold", hex: "#ca8a04" },
  { name: "Silver", hex: "#cbd5e1" },
];

// Two-level nav taxonomy: gender (top-level tab) -> subCategory (product-level
// attribute). Mirrors what `product_categories` + a `gender` facet would look
// like as a real per-tenant catalog taxonomy (docs/03-multi-tenant-storefront.md).
export const CATEGORY_TREE: { label: string; value: Gender; subCategories: string[] }[] = [
  {
    label: "Men",
    value: "men",
    subCategories: [
      "T-Shirts",
      "Shirts",
      "Jeans",
      "Trousers",
      "Shorts",
      "Ethnic Wear",
      "Jackets",
      "Sweaters & Sweatshirts",
      "Suits & Blazers",
      "Innerwear & Loungewear",
      "Footwear",
      "Accessories",
    ],
  },
  {
    label: "Women",
    value: "women",
    subCategories: [
      "Sarees",
      "Kurtis",
      "Dresses",
      "Tops",
      "Jeans",
      "Trousers & Capris",
      "Lehengas",
      "Western Wear",
      "Ethnic Wear",
      "Skirts",
      "Lingerie & Sleepwear",
      "Footwear",
      "Jewellery & Accessories",
      "Handbags",
    ],
  },
  {
    label: "Kids",
    value: "kids",
    subCategories: ["Boys", "Girls", "Infant Wear", "Kids Footwear", "Kids Ethnic Wear", "Kids Winter Wear"],
  },
];

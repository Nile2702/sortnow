// Pure, dependency-free catalog constants safe to import from client
// components (header nav, homepage filters, the seller product form). Kept
// separate from lib/seed-data.ts because that file now pulls in lib/persist.ts
// (Node's fs/path) for server-side persistence - bundling that for the
// browser fails outright, so anything a client component needs must live
// here instead. seed-data.ts re-exports these so server code can keep
// importing everything from one place.
export type Gender = "men" | "women" | "kids";

// Kept as the full union, e.g. for a size dropdown filter that isn't scoped
// to one category (see app/search/page.tsx). Anywhere the category is known
// (the seller's product form, a category page) should use
// getSizeOptionsFor(subCategory) instead, so a shirt listing doesn't offer
// shoe sizes and vice versa.
export const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "6", "7", "8", "9", "10", "11", "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-12Y"];

const SIZE_GROUPS = {
  clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  freeSize: ["Free Size"],
  waist: ["28", "30", "32", "34", "36", "38"],
  footwear: ["6", "7", "8", "9", "10", "11"],
  kidsAge: ["0-1Y", "1-2Y", "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-12Y"],
  kidsFootwear: ["4", "6", "8", "10", "12", "13", "1", "2", "3"],
  none: [] as string[],
} satisfies Record<string, string[]>;

// Which size group applies to each subCategory - a shirt shouldn't offer
// shoe sizes, a saree (typically unstitched, one-size) shouldn't offer S/M/L,
// and jewellery shouldn't offer sizes at all. Falls back to "clothing" for
// any subCategory not listed here (new ones added to CATEGORY_TREE default
// to the most common case rather than showing nothing).
const SUBCATEGORY_SIZE_GROUP: Record<string, keyof typeof SIZE_GROUPS> = {
  // Men
  "T-Shirts": "clothing",
  Shirts: "clothing",
  Jeans: "waist",
  Trousers: "waist",
  Shorts: "waist",
  "Ethnic Wear": "clothing",
  Jackets: "clothing",
  "Sweaters & Sweatshirts": "clothing",
  "Suits & Blazers": "clothing",
  "Innerwear & Loungewear": "clothing",
  Footwear: "footwear",
  Accessories: "none",
  // Women
  Sarees: "freeSize",
  Kurtis: "clothing",
  Dresses: "clothing",
  Tops: "clothing",
  "Trousers & Capris": "waist",
  Lehengas: "clothing",
  "Western Wear": "clothing",
  Skirts: "clothing",
  "Lingerie & Sleepwear": "clothing",
  "Jewellery & Accessories": "none",
  Handbags: "none",
  // Kids
  Boys: "kidsAge",
  Girls: "kidsAge",
  "Infant Wear": "kidsAge",
  "Kids Footwear": "kidsFootwear",
  "Kids Ethnic Wear": "kidsAge",
  "Kids Winter Wear": "kidsAge",
};

export function getSizeOptionsFor(subCategory: string | undefined): string[] {
  const group = (subCategory && SUBCATEGORY_SIZE_GROUP[subCategory]) || "clothing";
  const sizes = SIZE_GROUPS[group];
  // Every sizeable category also offers Free Size as a catch-all (e.g. a
  // loose kurta or a one-size scarf), except where sizes don't apply at all.
  return group === "none" ? sizes : group === "freeSize" ? sizes : [...sizes, "Free Size"];
}

// Picks a sensible default subCategory to land a seller on when they first
// choose a gender - specifically, one that actually offers real sizes
// (S/M/L, waist, footwear, kids' age, etc.), not just whatever happens to
// be listed first. Women's list starts with Sarees, which is correctly
// Free-Size-only (a saree is unstitched, one-size cloth) - but since it's
// also the very first thing a new seller sees on the product form, that
// made sizing look broken/missing entirely before they'd even touched the
// subcategory picker. Falls back to the first subcategory if a gender's
// entire list is Free-Size/no-size (so it never returns nothing).
export function defaultSizedSubCategoryFor(gender: Gender): string {
  const tree = CATEGORY_TREE.find((c) => c.value === gender);
  if (!tree || tree.subCategories.length === 0) return "";
  return tree.subCategories.find((sc) => getSizeOptionsFor(sc).length > 1) ?? tree.subCategories[0];
}

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

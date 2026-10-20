// Idempotent seed script for the live Neon database - inserts the same 7
// demo stores (with themes, categories, products, reviews) that used to
// ship as INITIAL_STORES/INITIAL_THEMES/INITIAL_PRODUCTS/SEED_REVIEWS/etc.
// in the old in-memory lib/seed-data.ts, so a fresh database isn't empty on
// first real run. Every insert uses `ON CONFLICT (id) DO NOTHING`, so
// running this more than once is harmless - it only ever fills in rows
// that don't exist yet, never overwrites or duplicates.
//
// Run with:  node --experimental-strip-types scripts/seed-db.ts
// (plain Node, not part of the Next.js build - this talks to Postgres
// directly via `pg`, independent of lib/db.ts's Next-specific pool
// singleton, since a one-off script doesn't need that dev-mode guard.)
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { hashPassword } from "../lib/auth/password.ts";

const envPath = path.join(import.meta.dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");
const connectionString = match[1].trim();

const DEMO_SELLER_PASSWORD = "sortitout123";

function placeholderImage(label: string, bg: string, fg = "#ffffff", w = 600, h = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(w / 14)}" fill="${fg}"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

interface SeedStore {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  pincode: string;
  localMarket: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

// Index 0 shows first in the UI (stores.created_at DESC) - see the
// descending offsets applied when inserting, below.
const STORES: SeedStore[] = [
  { id: "store-urban-vogue", slug: "urban-vogue", name: "Urban Vogue", category: "ethnic", city: "Mumbai", pincode: "400050", localMarket: "Bandra", latitude: 19.0596, longitude: 72.8295, phone: "9876543210" },
  { id: "store-south-silk-house", slug: "south-silk-house", name: "South Silk House", category: "ethnic", city: "Chennai", pincode: "600017", localMarket: "T. Nagar", latitude: 13.0418, longitude: 80.2341 },
  { id: "store-denim-district", slug: "denim-district", name: "Denim District", category: "western", city: "Bengaluru", pincode: "560001", localMarket: "Commercial Street", latitude: 12.9822, longitude: 77.6086 },
  { id: "store-chandni-chowk-sarees", slug: "chandni-chowk-sarees", name: "Chandni Chowk Sarees Emporium", category: "ethnic", city: "Delhi", pincode: "110006", localMarket: "Chandni Chowk", latitude: 28.6506, longitude: 77.2303 },
  { id: "store-charminar-zardozi", slug: "charminar-zardozi", name: "Charminar Zardozi House", category: "ethnic", city: "Hyderabad", pincode: "500002", localMarket: "Charminar", latitude: 17.3616, longitude: 78.4747 },
  { id: "store-sole-street", slug: "sole-street", name: "Sole Street", category: "western", city: "Pune", pincode: "411005", localMarket: "FC Road", latitude: 18.5236, longitude: 73.8478 },
  { id: "store-bengal-handloom", slug: "bengal-handloom-co", name: "Bengal Handloom Co.", category: "ethnic", city: "Kolkata", pincode: "700019", localMarket: "Gariahat", latitude: 22.5186, longitude: 88.3654 },
];

const THEMES: Record<string, any> = {
  "store-urban-vogue": {
    version: 3,
    brand: {
      logoUrl: "",
      colors: { primary: "#7c2d12", secondary: "#f5deb3", accent: "#d97706", background: "#fffaf0", text: "#1c1917", saleBadge: "#e11d48" },
      typography: { headingFont: "Playfair Display", bodyFont: "Georgia", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [{ eyebrow: "Urban Vogue · Bandra", title: "Festive Ethnic, Curated For You", subtitle: "Handpicked sarees, kurtis and lehengas from Bandra's favourite ethnic boutique.", image: "/hero/urban-vogue.avif" }],
      featuredCollection: { title: "This Week's Picks", maxItems: 8 },
    },
  },
  "store-south-silk-house": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: { primary: "#7a1f3d", secondary: "#ffe9d6", accent: "#c98a2c", background: "#fffdf8", text: "#26140f", saleBadge: "#b8171f" },
      typography: { headingFont: "Marcellus", bodyFont: "Noto Sans", baseSizePx: 16 },
      borderRadiusScale: "sharp",
    },
    layout: {
      gridStyle: "4-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [{ eyebrow: "South Silk House · T. Nagar", title: "Signature Kanjivaram Silks", subtitle: "Pure zari-bordered silk sarees, woven by Kanchipuram's master weavers." }],
      featuredCollection: { title: "Signature Kanjivaram", maxItems: 8 },
    },
  },
  "store-denim-district": {
    version: 2,
    brand: {
      logoUrl: "",
      colors: { primary: "#1e3a8a", secondary: "#e5e7eb", accent: "#2563eb", background: "#f8fafc", text: "#0f172a", saleBadge: "#dc2626" },
      typography: { headingFont: "Poppins", bodyFont: "Inter", baseSizePx: 16 },
      borderRadiusScale: "pill",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "featuredCollection", "categoryNav", "newArrivals"],
      heroCarousel: [{ eyebrow: "Denim District · Commercial Street", title: "New Denim, Just Dropped", subtitle: "Slim fits, oversized jackets, and everyday essentials for men." }],
      featuredCollection: { title: "Fresh Fits", maxItems: 8 },
    },
  },
  "store-chandni-chowk-sarees": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: { primary: "#a11d33", secondary: "#ffe3c2", accent: "#d4a017", background: "#fffaf2", text: "#2a0f0f", saleBadge: "#c2410c" },
      typography: { headingFont: "Marcellus", bodyFont: "Noto Sans", baseSizePx: 16 },
      borderRadiusScale: "sharp",
    },
    layout: {
      gridStyle: "4-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [{ eyebrow: "Chandni Chowk Sarees Emporium · Old Delhi", title: "Old Delhi's Bridal Saree Bazaar, Online", subtitle: "Six decades of wholesale saree trade, now a click away." }],
      featuredCollection: { title: "Bazaar Bestsellers", maxItems: 8 },
    },
  },
  "store-charminar-zardozi": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: { primary: "#166534", secondary: "#fef3c7", accent: "#b45309", background: "#fefdf8", text: "#1c1917", saleBadge: "#be123c" },
      typography: { headingFont: "Playfair Display", bodyFont: "Georgia", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [{ eyebrow: "Charminar Zardozi House · Hyderabad", title: "Hand-Embroidered Zardozi, From The Old City", subtitle: "Heirloom-quality zardozi and pearl work on every piece." }],
      featuredCollection: { title: "Old City Heirlooms", maxItems: 8 },
    },
  },
  "store-sole-street": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: { primary: "#0f172a", secondary: "#fde047", accent: "#f97316", background: "#f8fafc", text: "#0f172a", saleBadge: "#dc2626" },
      typography: { headingFont: "Poppins", bodyFont: "Inter", baseSizePx: 16 },
      borderRadiusScale: "pill",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "featuredCollection", "categoryNav", "newArrivals"],
      heroCarousel: [{ eyebrow: "Sole Street · FC Road, Pune", title: "Sneakers & Streetwear For Campus Life", subtitle: "Sneakers, joggers, and hoodies picked for Pune's college crowd.", image: "/hero/sneakers.webp" }],
      featuredCollection: { title: "Fresh Drops", maxItems: 8 },
    },
  },
  "store-bengal-handloom": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: { primary: "#7c2d12", secondary: "#fef9c3", accent: "#15803d", background: "#fffdf7", text: "#1c1917", saleBadge: "#b91c1c" },
      typography: { headingFont: "Marcellus", bodyFont: "Noto Sans", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "4-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [{ eyebrow: "Bengal Handloom Co. · Gariahat, Kolkata", title: "Tant & Jamdani, Woven In West Bengal", subtitle: "Authentic handloom cotton and jamdani sarees sourced directly from weaver co-ops." }],
      featuredCollection: { title: "Weaver Co-op Picks", maxItems: 8 },
    },
  },
};

const CATEGORIES: Record<string, { id: string; name: string }[]> = {
  "store-urban-vogue": [
    { id: "cat-sarees", name: "Sarees" },
    { id: "cat-kurtis", name: "Kurtis" },
    { id: "cat-lehengas", name: "Lehengas" },
    { id: "cat-kids-ethnic", name: "Kids Ethnic" },
  ],
  "store-south-silk-house": [
    { id: "cat-silk-sarees", name: "Silk Sarees" },
    { id: "cat-cotton-sarees", name: "Cotton Sarees" },
  ],
  "store-denim-district": [
    { id: "cat-jeans", name: "Jeans" },
    { id: "cat-jackets", name: "Jackets" },
    { id: "cat-tshirts", name: "T-Shirts" },
    { id: "cat-kids-denim", name: "Kids Denim" },
  ],
  "store-chandni-chowk-sarees": [
    { id: "cat-ccs-bridal-sarees", name: "Bridal Sarees" },
    { id: "cat-ccs-daily-sarees", name: "Daily Wear Sarees" },
  ],
  "store-charminar-zardozi": [
    { id: "cat-cz-lehengas", name: "Zardozi Lehengas" },
    { id: "cat-cz-kurtis", name: "Embroidered Kurtis" },
  ],
  "store-sole-street": [
    { id: "cat-ss-sneakers", name: "Sneakers" },
    { id: "cat-ss-joggers", name: "Joggers" },
    { id: "cat-ss-hoodies", name: "Hoodies" },
  ],
  "store-bengal-handloom": [
    { id: "cat-bh-jamdani", name: "Jamdani Sarees" },
    { id: "cat-bh-tant", name: "Tant Sarees" },
    { id: "cat-bh-kids", name: "Kids Ethnic" },
  ],
};

const PRODUCTS = [
  { id: "p-uv-1", storeId: "store-urban-vogue", storeSlug: "urban-vogue", categoryId: "cat-sarees", gender: "women", subCategory: "Sarees", title: "Banarasi Silk Saree — Maroon", description: "Handwoven Banarasi silk saree with a zari border, unstitched blouse piece included.", fabric: "Silk", color: "Maroon", basePrice: 2499, compareAtPrice: 3999, images: [{ url: placeholderImage("Banarasi Silk Saree", "#7c2d12", "#f5deb3") }], sizes: ["Free Size"], stockRemaining: 3, createdAt: "2026-08-30" },
  { id: "p-uv-2", storeId: "store-urban-vogue", storeSlug: "urban-vogue", categoryId: "cat-kurtis", gender: "women", subCategory: "Kurtis", title: "Cotton Anarkali Kurti — Mustard", description: "Breathable cotton Anarkali kurti, machine embroidery on the yoke.", fabric: "Cotton", color: "Mustard", basePrice: 899, images: [{ url: placeholderImage("Anarkali Kurti", "#d97706", "#fffaf0") }], sizes: ["S", "M", "L", "XL"], stockRemaining: 12, createdAt: "2026-08-28" },
  { id: "p-uv-3", storeId: "store-urban-vogue", storeSlug: "urban-vogue", categoryId: "cat-lehengas", gender: "women", subCategory: "Lehengas", title: "Bridal Lehenga — Wine Red", description: "Heavy zardozi bridal lehenga with dupatta, fully lined.", fabric: "Velvet", color: "Red", basePrice: 8999, compareAtPrice: 12999, images: [{ url: placeholderImage("Bridal Lehenga", "#9f1239", "#fce7f3") }], sizes: ["S", "M", "L"], stockRemaining: 2, createdAt: "2026-08-20" },
  { id: "p-uv-4", storeId: "store-urban-vogue", storeSlug: "urban-vogue", categoryId: "cat-kurtis", gender: "women", subCategory: "Kurtis", title: "Chikankari Straight Kurti — White", description: "Lucknowi chikankari hand-embroidered straight kurti.", fabric: "Cotton", color: "White", basePrice: 1299, images: [{ url: placeholderImage("Chikankari Kurti", "#f5deb3", "#7c2d12") }], sizes: ["S", "M", "L", "XL", "XXL"], stockRemaining: 8, createdAt: "2026-09-01" },
  { id: "p-ssh-1", storeId: "store-south-silk-house", storeSlug: "south-silk-house", categoryId: "cat-silk-sarees", gender: "women", subCategory: "Sarees", title: "Kanjivaram Silk Saree — Emerald & Gold", description: "Pure Kanjivaram silk with a temple-design gold zari border.", fabric: "Silk", color: "Emerald Green", basePrice: 5999, compareAtPrice: 7999, images: [{ url: placeholderImage("Kanjivaram Silk Saree", "#7a1f3d", "#ffe9d6") }], sizes: ["Free Size"], stockRemaining: 4, createdAt: "2026-08-25" },
  { id: "p-ssh-2", storeId: "store-south-silk-house", storeSlug: "south-silk-house", categoryId: "cat-cotton-sarees", gender: "women", subCategory: "Sarees", title: "Handloom Cotton Saree — Indigo", description: "Everyday handloom cotton saree, pre-washed, easy drape.", fabric: "Cotton", color: "Navy Blue", basePrice: 1499, images: [{ url: placeholderImage("Handloom Cotton Saree", "#c98a2c", "#fffdf8") }], sizes: ["Free Size"], stockRemaining: 15, createdAt: "2026-08-29" },
  { id: "p-dd-1", storeId: "store-denim-district", storeSlug: "denim-district", categoryId: "cat-jeans", gender: "men", subCategory: "Jeans", title: "Slim Fit Stretch Jeans — Indigo", description: "4-way stretch slim fit denim, mid-rise.", fabric: "Denim", color: "Navy Blue", basePrice: 1799, compareAtPrice: 2399, images: [{ url: placeholderImage("Slim Fit Jeans", "#1e3a8a", "#e5e7eb") }], sizes: ["30", "32", "34", "36"], stockRemaining: 20, createdAt: "2026-08-27" },
  { id: "p-dd-2", storeId: "store-denim-district", storeSlug: "denim-district", categoryId: "cat-jackets", gender: "men", subCategory: "Jackets", title: "Oversized Denim Jacket", description: "Washed oversized denim jacket with contrast stitching.", fabric: "Denim", basePrice: 2299, images: [{ url: placeholderImage("Denim Jacket", "#2563eb", "#f8fafc") }], sizes: ["S", "M", "L", "XL"], stockRemaining: 6, createdAt: "2026-09-01" },
  { id: "p-uv-5", storeId: "store-urban-vogue", storeSlug: "urban-vogue", categoryId: "cat-kids-ethnic", gender: "kids", subCategory: "Girls", title: "Kids Ethnic Kurta Set — Pink", description: "Festive kurta and sharara set for girls, soft cotton blend.", fabric: "Cotton Blend", color: "Pink", basePrice: 799, compareAtPrice: 1099, images: [{ url: placeholderImage("Kids Kurta Set", "#db2777", "#fdf2f8") }], sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"], stockRemaining: 10, createdAt: "2026-08-31" },
  { id: "p-dd-3", storeId: "store-denim-district", storeSlug: "denim-district", categoryId: "cat-kids-denim", gender: "kids", subCategory: "Boys", title: "Kids Denim Dungaree — Blue", description: "Adjustable-strap denim dungaree with a printed tee.", fabric: "Denim", color: "Royal Blue", basePrice: 999, images: [{ url: placeholderImage("Kids Dungaree", "#1e40af", "#dbeafe") }], sizes: ["2-3Y", "4-5Y", "6-7Y"], stockRemaining: 14, createdAt: "2026-09-02" },
  { id: "p-ccs-1", storeId: "store-chandni-chowk-sarees", storeSlug: "chandni-chowk-sarees", categoryId: "cat-ccs-bridal-sarees", gender: "women", subCategory: "Sarees", title: "Zari Bridal Saree — Deep Red", description: "Heavy zari-work bridal saree with matching unstitched blouse, straight from the Chandni Chowk wholesale market.", fabric: "Silk Blend", color: "Red", basePrice: 4499, compareAtPrice: 6999, images: [{ url: placeholderImage("Zari Bridal Saree", "#a11d33", "#ffe3c2") }], sizes: ["Free Size"], stockRemaining: 5, createdAt: "2026-08-22" },
  { id: "p-ccs-2", storeId: "store-chandni-chowk-sarees", storeSlug: "chandni-chowk-sarees", categoryId: "cat-ccs-daily-sarees", gender: "women", subCategory: "Sarees", title: "Printed Chiffon Saree — Peach", description: "Lightweight printed chiffon saree for everyday office wear.", fabric: "Chiffon", color: "Peach", basePrice: 899, images: [{ url: placeholderImage("Printed Chiffon Saree", "#d4a017", "#fffaf2") }], sizes: ["Free Size"], stockRemaining: 18, createdAt: "2026-08-30" },
  { id: "p-ccs-3", storeId: "store-chandni-chowk-sarees", storeSlug: "chandni-chowk-sarees", categoryId: "cat-ccs-bridal-sarees", gender: "women", subCategory: "Sarees", title: "Banarasi Organza Saree — Gold", description: "Organza saree with woven Banarasi motifs, ideal for receptions.", fabric: "Organza", color: "Gold", basePrice: 3299, compareAtPrice: 4499, images: [{ url: placeholderImage("Banarasi Organza Saree", "#c2410c", "#fff7ed") }], sizes: ["Free Size"], stockRemaining: 7, createdAt: "2026-09-03" },
  { id: "p-cz-1", storeId: "store-charminar-zardozi", storeSlug: "charminar-zardozi", categoryId: "cat-cz-lehengas", gender: "women", subCategory: "Lehengas", title: "Zardozi Bridal Lehenga — Emerald", description: "Hand-embroidered zardozi and pearl work lehenga with dupatta.", fabric: "Velvet", color: "Emerald Green", basePrice: 12999, compareAtPrice: 17999, images: [{ url: placeholderImage("Zardozi Lehenga", "#166534", "#fef3c7") }], sizes: ["S", "M", "L"], stockRemaining: 3, createdAt: "2026-08-24" },
  { id: "p-cz-2", storeId: "store-charminar-zardozi", storeSlug: "charminar-zardozi", categoryId: "cat-cz-kurtis", gender: "women", subCategory: "Kurtis", title: "Zardozi Embroidered Kurti — Maroon", description: "Straight-cut kurti with hand zardozi embroidery on the neckline.", fabric: "Georgette", color: "Maroon", basePrice: 1899, images: [{ url: placeholderImage("Zardozi Kurti", "#b45309", "#fefdf8") }], sizes: ["S", "M", "L", "XL"], stockRemaining: 9, createdAt: "2026-08-31" },
  { id: "p-cz-3", storeId: "store-charminar-zardozi", storeSlug: "charminar-zardozi", categoryId: "cat-cz-lehengas", gender: "kids", subCategory: "Girls", title: "Kids Zardozi Lehenga Set — Pink", description: "Mini zardozi lehenga set for festive occasions.", fabric: "Net", color: "Pink", basePrice: 1599, compareAtPrice: 2199, images: [{ url: placeholderImage("Kids Zardozi Lehenga", "#be123c", "#fdf2f8") }], sizes: ["2-3Y", "4-5Y", "6-7Y"], stockRemaining: 6, createdAt: "2026-09-02" },
  { id: "p-ss-1", storeId: "store-sole-street", storeSlug: "sole-street", categoryId: "cat-ss-sneakers", gender: "men", subCategory: "Footwear", title: "Chunky Retro Sneakers — White/Grey", description: "Everyday chunky sneakers with cushioned sole and mesh upper.", fabric: "Mesh & EVA", color: "White", basePrice: 2799, compareAtPrice: 3499, images: [{ url: placeholderImage("Retro Sneakers", "#0f172a", "#fde047") }], sizes: ["7", "8", "9", "10"], stockRemaining: 11, createdAt: "2026-08-26" },
  { id: "p-ss-2", storeId: "store-sole-street", storeSlug: "sole-street", categoryId: "cat-ss-hoodies", gender: "men", subCategory: "Jackets", title: "Oversized Fleece Hoodie — Charcoal", description: "Heavyweight fleece hoodie, oversized fit, kangaroo pocket.", fabric: "Cotton Fleece", color: "Charcoal", basePrice: 1499, images: [{ url: placeholderImage("Fleece Hoodie", "#f97316", "#0f172a") }], sizes: ["S", "M", "L", "XL"], stockRemaining: 16, createdAt: "2026-09-01" },
  { id: "p-ss-3", storeId: "store-sole-street", storeSlug: "sole-street", categoryId: "cat-ss-joggers", gender: "women", subCategory: "Western Wear", title: "Track Joggers — Sage Green", description: "Tapered fit joggers with side stripe detailing, perfect for campus wear.", fabric: "Cotton Terry", color: "Olive", basePrice: 1099, images: [{ url: placeholderImage("Track Joggers", "#166534", "#f0fdf4") }], sizes: ["S", "M", "L", "XL"], stockRemaining: 13, createdAt: "2026-09-03" },
  { id: "p-bh-1", storeId: "store-bengal-handloom", storeSlug: "bengal-handloom-co", categoryId: "cat-bh-jamdani", gender: "women", subCategory: "Sarees", title: "Jamdani Saree — Ivory & Red", description: "Handwoven jamdani cotton saree with traditional motifs, sourced from a Shantipur weaver co-op.", fabric: "Jamdani Cotton", color: "White", basePrice: 3799, compareAtPrice: 4999, images: [{ url: placeholderImage("Jamdani Saree", "#7c2d12", "#fef9c3") }], sizes: ["Free Size"], stockRemaining: 6, createdAt: "2026-08-23" },
  { id: "p-bh-2", storeId: "store-bengal-handloom", storeSlug: "bengal-handloom-co", categoryId: "cat-bh-tant", gender: "women", subCategory: "Sarees", title: "Tant Cotton Saree — White & Green", description: "Classic Bengal tant cotton saree with a woven border, breathable for daily wear.", fabric: "Tant Cotton", color: "White", basePrice: 1299, images: [{ url: placeholderImage("Tant Cotton Saree", "#15803d", "#fffdf7") }], sizes: ["Free Size"], stockRemaining: 20, createdAt: "2026-08-29" },
  { id: "p-bh-3", storeId: "store-bengal-handloom", storeSlug: "bengal-handloom-co", categoryId: "cat-bh-kids", gender: "kids", subCategory: "Girls", title: "Kids Tant Cotton Frock — Yellow", description: "Lightweight handloom cotton frock for girls, breathable for daily summer wear.", fabric: "Tant Cotton", color: "Yellow", basePrice: 599, compareAtPrice: 799, images: [{ url: placeholderImage("Kids Tant Frock", "#b91c1c", "#fef9c3") }], sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"], stockRemaining: 12, createdAt: "2026-09-01" },
];

const REVIEWS = [
  { id: "rev-1", productId: "p-uv-1", authorName: "Priya S.", rating: 5, title: "Gorgeous saree, exactly as pictured", comment: "The zari work is stunning and the fabric drapes beautifully. Got so many compliments at a wedding. Delivery from the store was quick too.", verifiedPurchase: true, createdAt: "2026-08-15T10:00:00.000Z" },
  { id: "rev-2", productId: "p-uv-1", authorName: "Ananya R.", rating: 4, title: "Beautiful but runs slightly heavy", comment: "Color and border are exactly as shown. Only reason for 4 stars is the saree is a bit heavier than I expected, but great for winter functions.", verifiedPurchase: true, createdAt: "2026-08-22T14:30:00.000Z" },
  { id: "rev-3", productId: "p-uv-2", authorName: "Meera K.", rating: 5, title: "Perfect everyday kurti", comment: "Very comfortable cotton fabric, true to size, and the mustard color is vibrant without being loud. Ordering another one in a different color.", verifiedPurchase: true, createdAt: "2026-08-10T09:15:00.000Z" },
  { id: "rev-4", productId: "p-uv-2", authorName: "Kavya J.", rating: 4, comment: "Good quality for the price. Embroidery on the yoke is neat. Runs true to size.", verifiedPurchase: false, createdAt: "2026-08-29T18:45:00.000Z" },
  { id: "rev-5", productId: "p-dd-1", authorName: "Rohan M.", rating: 5, title: "Best fit I've found", comment: "Finally a slim fit that doesn't feel restrictive. The stretch fabric moves with you. Ordered a second pair in a different wash.", verifiedPurchase: true, createdAt: "2026-08-18T11:20:00.000Z" },
  { id: "rev-6", productId: "p-dd-1", authorName: "Arjun P.", rating: 3, comment: "Decent jeans but the color faded slightly after the second wash. Fit is great though.", verifiedPurchase: true, createdAt: "2026-09-01T08:00:00.000Z" },
  { id: "rev-7", productId: "p-ssh-1", authorName: "Lakshmi V.", rating: 5, title: "Authentic Kanjivaram quality", comment: "You can tell this is genuine pure silk - the weight, the sheen, the zari. Worth every rupee. Packaging was also very secure.", verifiedPurchase: true, createdAt: "2026-08-12T16:00:00.000Z" },
  { id: "rev-8", productId: "p-ccs-1", authorName: "Simran K.", rating: 5, title: "Wholesale-market quality, retail convenience", comment: "Reserved it online and picked it up the same evening - the zari work is even better in person. Great for my sister's reception.", verifiedPurchase: true, createdAt: "2026-08-27T12:10:00.000Z" },
  { id: "rev-9", productId: "p-ccs-2", authorName: "Neha A.", rating: 4, comment: "Lightweight and easy to drape for daily office wear. Color is slightly brighter in person than the photo, in a good way.", verifiedPurchase: false, createdAt: "2026-09-02T09:40:00.000Z" },
  { id: "rev-10", productId: "p-cz-1", authorName: "Fatima S.", rating: 5, title: "Heirloom-quality zardozi", comment: "The pearl and zardozi work is hand-done and it shows. Tried it on at the store before deciding - fit exactly as expected.", verifiedPurchase: true, createdAt: "2026-08-19T15:20:00.000Z" },
  { id: "rev-11", productId: "p-cz-2", authorName: "Ayesha M.", rating: 4, comment: "Beautiful embroidery on the neckline. Runs slightly large, so size down if you're between sizes.", verifiedPurchase: true, createdAt: "2026-08-30T17:05:00.000Z" },
  { id: "rev-12", productId: "p-ss-1", authorName: "Karthik R.", rating: 5, title: "Comfortable all day on campus", comment: "Cushioning is great for walking between classes all day. Sizing runs true - ordered my usual size and it fit perfectly.", verifiedPurchase: true, createdAt: "2026-08-24T13:30:00.000Z" },
  { id: "rev-13", productId: "p-ss-2", authorName: "Vivek T.", rating: 4, comment: "Really warm and the oversized fit is exactly what I wanted. Fabric feels slightly thinner than expected for the price.", verifiedPurchase: false, createdAt: "2026-09-03T10:15:00.000Z" },
  { id: "rev-14", productId: "p-bh-1", authorName: "Ritika D.", rating: 5, title: "Genuine handloom, worth the trip", comment: "You can feel the difference from machine-made jamdani immediately. Reserved it and the shopkeeper had it ready with the blouse piece matched.", verifiedPurchase: true, createdAt: "2026-08-21T11:45:00.000Z" },
  { id: "rev-15", productId: "p-bh-2", authorName: "Sohini B.", rating: 5, comment: "My go-to for everyday tant sarees now. Breathable even in Kolkata's humidity, and the border doesn't fray after multiple washes.", verifiedPurchase: true, createdAt: "2026-08-31T08:50:00.000Z" },
];

const STORE_REVIEWS = [
  { id: "storerev-1", storeId: "store-urban-vogue", authorName: "Priya S.", rating: 5, comment: "Reserved online and the staff had everything ready when I walked in. Easy, no-pressure experience.", createdAt: "2026-08-16T12:00:00.000Z" },
  { id: "storerev-2", storeId: "store-urban-vogue", authorName: "Rohan M.", rating: 4, comment: "Good selection and friendly staff. Store gets crowded on weekends so go on a weekday if you can.", createdAt: "2026-08-25T16:30:00.000Z" },
];

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const SUBSCRIPTIONS: Record<string, { planCode: string; currentPeriodEnd: string }> = {
  "store-urban-vogue": { planCode: "pro", currentPeriodEnd: futureDate(18) },
  "store-south-silk-house": { planCode: "flex", currentPeriodEnd: futureDate(9) },
  "store-denim-district": { planCode: "max", currentPeriodEnd: futureDate(25) },
};

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const sellerPasswordHash = hashPassword(DEMO_SELLER_PASSWORD);

    for (const [i, store] of STORES.entries()) {
      // Index 0 (Urban Vogue) gets the most recent created_at among the 7
      // seed stores, index 6 (Bengal Handloom) the oldest - so
      // `ORDER BY created_at DESC` (see getAllStores()) reproduces the same
      // display order the old hand-written INITIAL_STORES array had.
      const createdAt = new Date(Date.now() - i * 60_000).toISOString();
      await client.query(
        `INSERT INTO stores (id, slug, name, status, category, city, pincode, local_market, latitude, longitude, phone, seller_password_hash, created_at)
         VALUES ($1,$2,$3,'active'::store_status,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [store.id, store.slug, store.name, store.category, store.city, store.pincode, store.localMarket, store.latitude, store.longitude, store.phone ?? null, sellerPasswordHash, createdAt]
      );
    }
    console.log(`Seeded ${STORES.length} stores.`);

    for (const [storeId, theme] of Object.entries(THEMES)) {
      await client.query(`INSERT INTO themes (store_id, theme) VALUES ($1,$2) ON CONFLICT (store_id) DO NOTHING`, [storeId, JSON.stringify(theme)]);
    }
    console.log(`Seeded ${Object.keys(THEMES).length} themes.`);

    let categoryCount = 0;
    for (const [storeId, cats] of Object.entries(CATEGORIES)) {
      for (const [i, cat] of cats.entries()) {
        await client.query(
          `INSERT INTO categories (id, store_id, name, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
          [cat.id, storeId, cat.name, i]
        );
        categoryCount++;
      }
    }
    console.log(`Seeded ${categoryCount} categories.`);

    for (const p of PRODUCTS) {
      await client.query(
        `INSERT INTO products (id, store_id, store_slug, category_id, gender, sub_category, title, description, fabric, color, base_price, compare_at_price, images, sizes, stock_remaining, created_at)
         VALUES ($1,$2,$3,$4,$5::gender,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.storeId, p.storeSlug, p.categoryId, p.gender, p.subCategory, p.title, p.description ?? null,
          p.fabric ?? null, p.color ?? null, p.basePrice, p.compareAtPrice ?? null, JSON.stringify(p.images),
          p.sizes, p.stockRemaining ?? null, p.createdAt,
        ]
      );
    }
    console.log(`Seeded ${PRODUCTS.length} products.`);

    for (const r of REVIEWS) {
      await client.query(
        `INSERT INTO reviews (id, product_id, author_name, rating, title, comment, verified_purchase, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.productId, r.authorName, r.rating, r.title ?? null, r.comment, r.verifiedPurchase, r.createdAt]
      );
    }
    console.log(`Seeded ${REVIEWS.length} product reviews.`);

    for (const r of STORE_REVIEWS) {
      await client.query(
        `INSERT INTO store_reviews (id, store_id, author_name, rating, comment, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.storeId, r.authorName, r.rating, r.comment, r.createdAt]
      );
    }
    console.log(`Seeded ${STORE_REVIEWS.length} store reviews.`);

    for (const [storeId, sub] of Object.entries(SUBSCRIPTIONS)) {
      await client.query(
        `INSERT INTO subscriptions (store_id, plan_code, status, current_period_end) VALUES ($1,$2::plan_code,'active',$3)
         ON CONFLICT (store_id) DO NOTHING`,
        [storeId, sub.planCode, sub.currentPeriodEnd]
      );
    }
    console.log(`Seeded ${Object.keys(SUBSCRIPTIONS).length} subscriptions.`);

    console.log("Seed complete.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("SEED FAILED:", e);
  process.exit(1);
});

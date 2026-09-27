// In-memory seed data standing in for the Tenant/Catalog/Search microservices
// during local development. Every /api/v1/* route reads from this module.
// Swap this file for real service calls once the backend exists — the shape
// mirrors database/schema.sql exactly so the swap is mechanical.
//
// State is mirrored to .data/db.json via lib/persist.ts so a server restart
// doesn't wipe every store edit, reservation, and review - see that file for
// what this does and doesn't guarantee.
import { loadPersisted, persist } from "./persist";
import { Gender, ALL_SIZES, CATEGORY_TREE } from "./catalog-constants";
import { hashPassword, verifyPassword } from "./auth/password";
import { lookupPincode } from "india-post-pincode";
import { fuzzyBestScore } from "./fuzzy-search";

export type { Gender };
export { ALL_SIZES, CATEGORY_TREE };

// Self-contained placeholder images (no external network dependency) so the
// demo renders identically offline. Swap for real CDN-hosted product/banner
// photos once merchants upload their own via the Media Pipeline.
function placeholderImage(label: string, bg: string, fg = "#ffffff", w = 600, h = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(w / 14)}" fill="${fg}"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export interface LiveSale {
  headline: string;
  discountLabel: string;
  startedAt: string;
  endsAt: string;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "active" | "suspended" | "closed";
  category: string;
  city: string;
  pincode: string;
  localMarket: string;
  latitude: number;
  longitude: number;
  liveSale?: LiveSale | null;
  // Optional - lets a seller sign in via OTP as an alternative to their
  // password (see /api/v1/seller/auth/otp/*). Not required at signup so
  // this doesn't break an existing password-only account.
  phone?: string;
  // Paid featured placement (see BOOST_PACKAGES) - ranks this store first in
  // "Stores near you" and /shops while active, same "flip an in-memory flag,
  // no real payment processor" convention as changePlan()/photo credits.
  boostedUntil?: string | null;
}

// Next.js dev-mode compiles route handlers on demand, which can give
// separately-compiled routes their own instance of this module until the
// module graph converges - so a plain `export const products = [...]`
// mutated by one route handler can appear unchanged to another. Anchoring
// the mutable state on `globalThis` (a true process-wide singleton,
// unaffected by per-route module duplication) is the standard fix, same
// pattern as the usual "globalThis.prisma" trick for dev-mode singletons.
declare global {
  // eslint-disable-next-line no-var
  var __sioStores: Store[] | undefined;
  var __sioThemes: Record<string, any> | undefined;
  var __sioProducts: Product[] | undefined;
}

const INITIAL_STORES: Store[] = [
  {
    id: "store-urban-vogue",
    slug: "urban-vogue",
    name: "Urban Vogue",
    status: "active",
    category: "ethnic",
    city: "Mumbai",
    pincode: "400050",
    localMarket: "Bandra",
    latitude: 19.0596,
    longitude: 72.8295,
    phone: "9876543210",
  },
  {
    id: "store-south-silk-house",
    slug: "south-silk-house",
    name: "South Silk House",
    status: "active",
    category: "ethnic",
    city: "Chennai",
    pincode: "600017",
    localMarket: "T. Nagar",
    latitude: 13.0418,
    longitude: 80.2341,
  },
  {
    id: "store-denim-district",
    slug: "denim-district",
    name: "Denim District",
    status: "active",
    category: "western",
    city: "Bengaluru",
    pincode: "560001",
    localMarket: "Commercial Street",
    latitude: 12.9822,
    longitude: 77.6086,
  },
  {
    id: "store-chandni-chowk-sarees",
    slug: "chandni-chowk-sarees",
    name: "Chandni Chowk Sarees Emporium",
    status: "active",
    category: "ethnic",
    city: "Delhi",
    pincode: "110006",
    localMarket: "Chandni Chowk",
    latitude: 28.6506,
    longitude: 77.2303,
  },
  {
    id: "store-charminar-zardozi",
    slug: "charminar-zardozi",
    name: "Charminar Zardozi House",
    status: "active",
    category: "ethnic",
    city: "Hyderabad",
    pincode: "500002",
    localMarket: "Charminar",
    latitude: 17.3616,
    longitude: 78.4747,
  },
  {
    id: "store-sole-street",
    slug: "sole-street",
    name: "Sole Street",
    status: "active",
    category: "western",
    city: "Pune",
    pincode: "411005",
    localMarket: "FC Road",
    latitude: 18.5236,
    longitude: 73.8478,
  },
  {
    id: "store-bengal-handloom",
    slug: "bengal-handloom-co",
    name: "Bengal Handloom Co.",
    status: "active",
    category: "ethnic",
    city: "Kolkata",
    pincode: "700019",
    localMarket: "Gariahat",
    latitude: 22.5186,
    longitude: 88.3654,
  },
];
export const stores: Store[] = globalThis.__sioStores ?? (globalThis.__sioStores = loadPersisted("stores", INITIAL_STORES));

// ---------------------------------------------------------------------
// Seller credentials: real per-store password hashes (scrypt, see
// lib/auth/password.ts), replacing the old "pick any store from a
// dropdown, no password" seller session. Every seed store shares the same
// demo password so the Seller Portal is still one-click to try - see the
// login page for the actual value. A real deployment would let each
// merchant set their own during onboarding instead of seeding one.
// ---------------------------------------------------------------------
export const DEMO_SELLER_PASSWORD = "sortitout123";

declare global {
  // eslint-disable-next-line no-var
  var __sioSellerCredentials: Record<string, string> | undefined;
}

function buildInitialSellerCredentials(): Record<string, string> {
  const creds: Record<string, string> = {};
  for (const store of INITIAL_STORES) creds[store.id] = hashPassword(DEMO_SELLER_PASSWORD);
  return creds;
}

const sellerCredentials: Record<string, string> =
  globalThis.__sioSellerCredentials ?? (globalThis.__sioSellerCredentials = loadPersisted("sellerCredentials", buildInitialSellerCredentials()));

export function verifySellerLogin(storeSlug: string, password: string): Store | null {
  const store = stores.find((s) => s.slug === storeSlug);
  if (!store) return null;
  const hash = sellerCredentials[store.id];
  if (!hash || !verifyPassword(password, hash)) return null;
  return store;
}

// OTP login only ever proves the caller owns this phone number - it must
// already be registered against exactly one store (set at signup or later
// via account settings), unlike shopper OTP login which has no
// pre-registration requirement at all.
export function findStoreByPhone(phone: string): Store | null {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  return stores.find((s) => s.phone && s.phone.replace(/\D/g, "").slice(-10) === normalized) ?? null;
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "store";
}

export interface CreateStoreInput {
  name: string;
  category: string;
  pincode: string;
  localMarket: string;
  password: string;
  phone?: string;
}

// Real "sign up as a new merchant" path - as opposed to verifySellerLogin
// above, which only ever authenticates one of the pre-seeded demo stores.
// The new store starts life as "draft" (not yet visible to shoppers) until
// the seller completes the onboarding/KYC flow, matching how a real
// marketplace wouldn't list an unverified merchant either.
export function createStore(input: CreateStoreInput): { store: Store } | { error: string } {
  const name = input.name.trim();
  if (!name) return { error: "Store name is required." };
  if (name.length > 120) return { error: "Store name is too long." };
  if (!input.localMarket.trim()) return { error: "Local market or area is required." };
  if (!input.password || input.password.length < 8) return { error: "Password must be at least 8 characters." };

  const geo = resolvePincode(input.pincode);
  if (!geo) return { error: "Couldn't recognize that PIN code." };

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (stores.some((s) => s.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const store: Store = {
    id: `store-${slug}-${Date.now().toString(36)}`,
    slug,
    name,
    status: "draft",
    category: input.category || "ethnic",
    city: geo.city,
    pincode: input.pincode,
    localMarket: input.localMarket.trim(),
    phone: input.phone?.trim() || undefined,
    latitude: geo.lat,
    longitude: geo.lng,
  };
  stores.unshift(store);
  persist("stores", stores);

  sellerCredentials[store.id] = hashPassword(input.password);
  persist("sellerCredentials", sellerCredentials);

  // A brand-new store still needs a theme record to render its storefront
  // page and Theme Studio at all - every seed store has one, so this one
  // gets a sensible neutral default (the app's own teal/ink brand colors)
  // rather than leaving themes[store.id] undefined.
  themes[store.id] = {
    version: 1,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#0f172a",
        secondary: "#f1f5f9",
        accent: "#0d9488",
        background: "#ffffff",
        text: "#0f172a",
        saleBadge: "#e11d48",
      },
      typography: { headingFont: "Inter", bodyFont: "Inter", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: `${store.name} · ${store.localMarket}`,
          title: "Welcome to our store",
          subtitle: "New arrivals, curated for you.",
        },
      ],
      featuredCollection: { title: "Featured", maxItems: 8 },
    },
  };
  persist("themes", themes);

  return { store };
}

const INITIAL_THEMES: Record<string, any> = {
  "store-urban-vogue": {
    version: 3,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#7c2d12",
        secondary: "#f5deb3",
        accent: "#d97706",
        background: "#fffaf0",
        text: "#1c1917",
        saleBadge: "#e11d48",
      },
      typography: { headingFont: "Playfair Display", bodyFont: "Georgia", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "Urban Vogue · Bandra",
          title: "Festive Ethnic, Curated For You",
          subtitle: "Handpicked sarees, kurtis and lehengas from Bandra's favourite ethnic boutique.",
        },
      ],
      featuredCollection: { title: "This Week's Picks", maxItems: 8 },
    },
  },
  "store-south-silk-house": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#7a1f3d",
        secondary: "#ffe9d6",
        accent: "#c98a2c",
        background: "#fffdf8",
        text: "#26140f",
        saleBadge: "#b8171f",
      },
      typography: { headingFont: "Marcellus", bodyFont: "Noto Sans", baseSizePx: 16 },
      borderRadiusScale: "sharp",
    },
    layout: {
      gridStyle: "4-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "South Silk House · T. Nagar",
          title: "Signature Kanjivaram Silks",
          subtitle: "Pure zari-bordered silk sarees, woven by Kanchipuram's master weavers.",
        },
      ],
      featuredCollection: { title: "Signature Kanjivaram", maxItems: 8 },
    },
  },
  "store-denim-district": {
    version: 2,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#1e3a8a",
        secondary: "#e5e7eb",
        accent: "#2563eb",
        background: "#f8fafc",
        text: "#0f172a",
        saleBadge: "#dc2626",
      },
      typography: { headingFont: "Poppins", bodyFont: "Inter", baseSizePx: 16 },
      borderRadiusScale: "pill",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "featuredCollection", "categoryNav", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "Denim District · Commercial Street",
          title: "New Denim, Just Dropped",
          subtitle: "Slim fits, oversized jackets, and everyday essentials for men.",
        },
      ],
      featuredCollection: { title: "Fresh Fits", maxItems: 8 },
    },
  },
  "store-chandni-chowk-sarees": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#a11d33",
        secondary: "#ffe3c2",
        accent: "#d4a017",
        background: "#fffaf2",
        text: "#2a0f0f",
        saleBadge: "#c2410c",
      },
      typography: { headingFont: "Marcellus", bodyFont: "Noto Sans", baseSizePx: 16 },
      borderRadiusScale: "sharp",
    },
    layout: {
      gridStyle: "4-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "Chandni Chowk Sarees Emporium · Old Delhi",
          title: "Old Delhi's Bridal Saree Bazaar, Online",
          subtitle: "Six decades of wholesale saree trade, now a click away.",
        },
      ],
      featuredCollection: { title: "Bazaar Bestsellers", maxItems: 8 },
    },
  },
  "store-charminar-zardozi": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#166534",
        secondary: "#fef3c7",
        accent: "#b45309",
        background: "#fefdf8",
        text: "#1c1917",
        saleBadge: "#be123c",
      },
      typography: { headingFont: "Playfair Display", bodyFont: "Georgia", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "Charminar Zardozi House · Hyderabad",
          title: "Hand-Embroidered Zardozi, From The Old City",
          subtitle: "Heirloom-quality zardozi and pearl work on every piece.",
        },
      ],
      featuredCollection: { title: "Old City Heirlooms", maxItems: 8 },
    },
  },
  "store-sole-street": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#0f172a",
        secondary: "#fde047",
        accent: "#f97316",
        background: "#f8fafc",
        text: "#0f172a",
        saleBadge: "#dc2626",
      },
      typography: { headingFont: "Poppins", bodyFont: "Inter", baseSizePx: 16 },
      borderRadiusScale: "pill",
    },
    layout: {
      gridStyle: "3-col",
      sectionOrder: ["hero", "featuredCollection", "categoryNav", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "Sole Street · FC Road, Pune",
          title: "Sneakers & Streetwear For Campus Life",
          subtitle: "Sneakers, joggers, and hoodies picked for Pune's college crowd.",
        },
      ],
      featuredCollection: { title: "Fresh Drops", maxItems: 8 },
    },
  },
  "store-bengal-handloom": {
    version: 1,
    brand: {
      logoUrl: "",
      colors: {
        primary: "#7c2d12",
        secondary: "#fef9c3",
        accent: "#15803d",
        background: "#fffdf7",
        text: "#1c1917",
        saleBadge: "#b91c1c",
      },
      typography: { headingFont: "Marcellus", bodyFont: "Noto Sans", baseSizePx: 16 },
      borderRadiusScale: "soft",
    },
    layout: {
      gridStyle: "4-col",
      sectionOrder: ["hero", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          eyebrow: "Bengal Handloom Co. · Gariahat, Kolkata",
          title: "Tant & Jamdani, Woven In West Bengal",
          subtitle: "Authentic handloom cotton and jamdani sarees sourced directly from weaver co-ops.",
        },
      ],
      featuredCollection: { title: "Weaver Co-op Picks", maxItems: 8 },
    },
  },
};
export const themes: Record<string, any> = globalThis.__sioThemes ?? (globalThis.__sioThemes = loadPersisted("themes", INITIAL_THEMES));

export const categories: Record<string, { id: string; name: string }[]> = {
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


export interface Product {
  id: string;
  storeId: string;
  storeSlug: string;
  categoryId: string;
  gender: Gender;
  subCategory: string;
  title: string;
  description?: string;
  fabric?: string;
  color?: string;
  // Shared by every colorway listed together from one "select colors" step
  // in the product form - lets the product page look up and show the
  // sibling colors as swatches. Undefined for anything created singly
  // (manual single-color, CSV bulk, AI bulk photos).
  colorGroupId?: string;
  // Seller-assigned, optional - a shopper who browsed online and shows up
  // in person can just read this out to the shopkeeper (or a shopper on
  // the phone can quote it) instead of describing the item or scrolling
  // through photos to find it. Purely a lookup aid; has no effect on
  // pricing, stock, or anything else.
  productCode?: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  sizes: string[];
  stockRemaining?: number;
  createdAt: string;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p-uv-1",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-sarees",
    gender: "women",
    subCategory: "Sarees",
    title: "Banarasi Silk Saree — Maroon",
    description: "Handwoven Banarasi silk saree with a zari border, unstitched blouse piece included.",
    fabric: "Silk",
    color: "Maroon",
    basePrice: 2499,
    compareAtPrice: 3999,
    images: [{ url: placeholderImage("Banarasi Silk Saree", "#7c2d12", "#f5deb3") }],
    sizes: ["Free Size"],
    stockRemaining: 3,
    createdAt: "2026-08-30",
  },
  {
    id: "p-uv-2",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-kurtis",
    gender: "women",
    subCategory: "Kurtis",
    title: "Cotton Anarkali Kurti — Mustard",
    description: "Breathable cotton Anarkali kurti, machine embroidery on the yoke.",
    fabric: "Cotton",
    color: "Mustard",
    basePrice: 899,
    images: [{ url: placeholderImage("Anarkali Kurti", "#d97706", "#fffaf0") }],
    sizes: ["S", "M", "L", "XL"],
    stockRemaining: 12,
    createdAt: "2026-08-28",
  },
  {
    id: "p-uv-3",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-lehengas",
    gender: "women",
    subCategory: "Lehengas",
    title: "Bridal Lehenga — Wine Red",
    description: "Heavy zardozi bridal lehenga with dupatta, fully lined.",
    fabric: "Velvet",
    color: "Red",
    basePrice: 8999,
    compareAtPrice: 12999,
    images: [{ url: placeholderImage("Bridal Lehenga", "#9f1239", "#fce7f3") }],
    sizes: ["S", "M", "L"],
    stockRemaining: 2,
    createdAt: "2026-08-20",
  },
  {
    id: "p-uv-4",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-kurtis",
    gender: "women",
    subCategory: "Kurtis",
    title: "Chikankari Straight Kurti — White",
    description: "Lucknowi chikankari hand-embroidered straight kurti.",
    fabric: "Cotton",
    color: "White",
    basePrice: 1299,
    images: [{ url: placeholderImage("Chikankari Kurti", "#f5deb3", "#7c2d12") }],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stockRemaining: 8,
    createdAt: "2026-09-01",
  },
  {
    id: "p-ssh-1",
    storeId: "store-south-silk-house",
    storeSlug: "south-silk-house",
    categoryId: "cat-silk-sarees",
    gender: "women",
    subCategory: "Sarees",
    title: "Kanjivaram Silk Saree — Emerald & Gold",
    description: "Pure Kanjivaram silk with a temple-design gold zari border.",
    fabric: "Silk",
    color: "Emerald Green",
    basePrice: 5999,
    compareAtPrice: 7999,
    images: [{ url: placeholderImage("Kanjivaram Silk Saree", "#7a1f3d", "#ffe9d6") }],
    sizes: ["Free Size"],
    stockRemaining: 4,
    createdAt: "2026-08-25",
  },
  {
    id: "p-ssh-2",
    storeId: "store-south-silk-house",
    storeSlug: "south-silk-house",
    categoryId: "cat-cotton-sarees",
    gender: "women",
    subCategory: "Sarees",
    title: "Handloom Cotton Saree — Indigo",
    description: "Everyday handloom cotton saree, pre-washed, easy drape.",
    fabric: "Cotton",
    color: "Navy Blue",
    basePrice: 1499,
    images: [{ url: placeholderImage("Handloom Cotton Saree", "#c98a2c", "#fffdf8") }],
    sizes: ["Free Size"],
    stockRemaining: 15,
    createdAt: "2026-08-29",
  },
  {
    id: "p-dd-1",
    storeId: "store-denim-district",
    storeSlug: "denim-district",
    categoryId: "cat-jeans",
    gender: "men",
    subCategory: "Jeans",
    title: "Slim Fit Stretch Jeans — Indigo",
    description: "4-way stretch slim fit denim, mid-rise.",
    fabric: "Denim",
    color: "Navy Blue",
    basePrice: 1799,
    compareAtPrice: 2399,
    images: [{ url: placeholderImage("Slim Fit Jeans", "#1e3a8a", "#e5e7eb") }],
    sizes: ["30", "32", "34", "36"],
    stockRemaining: 20,
    createdAt: "2026-08-27",
  },
  {
    id: "p-dd-2",
    storeId: "store-denim-district",
    storeSlug: "denim-district",
    categoryId: "cat-jackets",
    gender: "men",
    subCategory: "Jackets",
    title: "Oversized Denim Jacket",
    description: "Washed oversized denim jacket with contrast stitching.",
    fabric: "Denim",
    basePrice: 2299,
    images: [{ url: placeholderImage("Denim Jacket", "#2563eb", "#f8fafc") }],
    sizes: ["S", "M", "L", "XL"],
    stockRemaining: 6,
    createdAt: "2026-09-01",
  },
  {
    id: "p-uv-5",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-kids-ethnic",
    gender: "kids",
    subCategory: "Girls",
    title: "Kids Ethnic Kurta Set — Pink",
    description: "Festive kurta and sharara set for girls, soft cotton blend.",
    fabric: "Cotton Blend",
    color: "Pink",
    basePrice: 799,
    compareAtPrice: 1099,
    images: [{ url: placeholderImage("Kids Kurta Set", "#db2777", "#fdf2f8") }],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    stockRemaining: 10,
    createdAt: "2026-08-31",
  },
  {
    id: "p-dd-3",
    storeId: "store-denim-district",
    storeSlug: "denim-district",
    categoryId: "cat-kids-denim",
    gender: "kids",
    subCategory: "Boys",
    title: "Kids Denim Dungaree — Blue",
    description: "Adjustable-strap denim dungaree with a printed tee.",
    fabric: "Denim",
    color: "Royal Blue",
    basePrice: 999,
    images: [{ url: placeholderImage("Kids Dungaree", "#1e40af", "#dbeafe") }],
    sizes: ["2-3Y", "4-5Y", "6-7Y"],
    stockRemaining: 14,
    createdAt: "2026-09-02",
  },
  {
    id: "p-ccs-1",
    storeId: "store-chandni-chowk-sarees",
    storeSlug: "chandni-chowk-sarees",
    categoryId: "cat-ccs-bridal-sarees",
    gender: "women",
    subCategory: "Sarees",
    title: "Zari Bridal Saree — Deep Red",
    description: "Heavy zari-work bridal saree with matching unstitched blouse, straight from the Chandni Chowk wholesale market.",
    fabric: "Silk Blend",
    color: "Red",
    basePrice: 4499,
    compareAtPrice: 6999,
    images: [{ url: placeholderImage("Zari Bridal Saree", "#a11d33", "#ffe3c2") }],
    sizes: ["Free Size"],
    stockRemaining: 5,
    createdAt: "2026-08-22",
  },
  {
    id: "p-ccs-2",
    storeId: "store-chandni-chowk-sarees",
    storeSlug: "chandni-chowk-sarees",
    categoryId: "cat-ccs-daily-sarees",
    gender: "women",
    subCategory: "Sarees",
    title: "Printed Chiffon Saree — Peach",
    description: "Lightweight printed chiffon saree for everyday office wear.",
    fabric: "Chiffon",
    color: "Peach",
    basePrice: 899,
    images: [{ url: placeholderImage("Printed Chiffon Saree", "#d4a017", "#fffaf2") }],
    sizes: ["Free Size"],
    stockRemaining: 18,
    createdAt: "2026-08-30",
  },
  {
    id: "p-ccs-3",
    storeId: "store-chandni-chowk-sarees",
    storeSlug: "chandni-chowk-sarees",
    categoryId: "cat-ccs-bridal-sarees",
    gender: "women",
    subCategory: "Sarees",
    title: "Banarasi Organza Saree — Gold",
    description: "Organza saree with woven Banarasi motifs, ideal for receptions.",
    fabric: "Organza",
    color: "Gold",
    basePrice: 3299,
    compareAtPrice: 4499,
    images: [{ url: placeholderImage("Banarasi Organza Saree", "#c2410c", "#fff7ed") }],
    sizes: ["Free Size"],
    stockRemaining: 7,
    createdAt: "2026-09-03",
  },
  {
    id: "p-cz-1",
    storeId: "store-charminar-zardozi",
    storeSlug: "charminar-zardozi",
    categoryId: "cat-cz-lehengas",
    gender: "women",
    subCategory: "Lehengas",
    title: "Zardozi Bridal Lehenga — Emerald",
    description: "Hand-embroidered zardozi and pearl work lehenga with dupatta.",
    fabric: "Velvet",
    color: "Emerald Green",
    basePrice: 12999,
    compareAtPrice: 17999,
    images: [{ url: placeholderImage("Zardozi Lehenga", "#166534", "#fef3c7") }],
    sizes: ["S", "M", "L"],
    stockRemaining: 3,
    createdAt: "2026-08-24",
  },
  {
    id: "p-cz-2",
    storeId: "store-charminar-zardozi",
    storeSlug: "charminar-zardozi",
    categoryId: "cat-cz-kurtis",
    gender: "women",
    subCategory: "Kurtis",
    title: "Zardozi Embroidered Kurti — Maroon",
    description: "Straight-cut kurti with hand zardozi embroidery on the neckline.",
    fabric: "Georgette",
    color: "Maroon",
    basePrice: 1899,
    images: [{ url: placeholderImage("Zardozi Kurti", "#b45309", "#fefdf8") }],
    sizes: ["S", "M", "L", "XL"],
    stockRemaining: 9,
    createdAt: "2026-08-31",
  },
  {
    id: "p-cz-3",
    storeId: "store-charminar-zardozi",
    storeSlug: "charminar-zardozi",
    categoryId: "cat-cz-lehengas",
    gender: "kids",
    subCategory: "Girls",
    title: "Kids Zardozi Lehenga Set — Pink",
    description: "Mini zardozi lehenga set for festive occasions.",
    fabric: "Net",
    color: "Pink",
    basePrice: 1599,
    compareAtPrice: 2199,
    images: [{ url: placeholderImage("Kids Zardozi Lehenga", "#be123c", "#fdf2f8") }],
    sizes: ["2-3Y", "4-5Y", "6-7Y"],
    stockRemaining: 6,
    createdAt: "2026-09-02",
  },
  {
    id: "p-ss-1",
    storeId: "store-sole-street",
    storeSlug: "sole-street",
    categoryId: "cat-ss-sneakers",
    gender: "men",
    subCategory: "Footwear",
    title: "Chunky Retro Sneakers — White/Grey",
    description: "Everyday chunky sneakers with cushioned sole and mesh upper.",
    fabric: "Mesh & EVA",
    color: "White",
    basePrice: 2799,
    compareAtPrice: 3499,
    images: [{ url: placeholderImage("Retro Sneakers", "#0f172a", "#fde047") }],
    sizes: ["7", "8", "9", "10"],
    stockRemaining: 11,
    createdAt: "2026-08-26",
  },
  {
    id: "p-ss-2",
    storeId: "store-sole-street",
    storeSlug: "sole-street",
    categoryId: "cat-ss-hoodies",
    gender: "men",
    subCategory: "Jackets",
    title: "Oversized Fleece Hoodie — Charcoal",
    description: "Heavyweight fleece hoodie, oversized fit, kangaroo pocket.",
    fabric: "Cotton Fleece",
    color: "Charcoal",
    basePrice: 1499,
    images: [{ url: placeholderImage("Fleece Hoodie", "#f97316", "#0f172a") }],
    sizes: ["S", "M", "L", "XL"],
    stockRemaining: 16,
    createdAt: "2026-09-01",
  },
  {
    id: "p-ss-3",
    storeId: "store-sole-street",
    storeSlug: "sole-street",
    categoryId: "cat-ss-joggers",
    gender: "women",
    subCategory: "Western Wear",
    title: "Track Joggers — Sage Green",
    description: "Tapered fit joggers with side stripe detailing, perfect for campus wear.",
    fabric: "Cotton Terry",
    color: "Olive",
    basePrice: 1099,
    images: [{ url: placeholderImage("Track Joggers", "#166534", "#f0fdf4") }],
    sizes: ["S", "M", "L", "XL"],
    stockRemaining: 13,
    createdAt: "2026-09-03",
  },
  {
    id: "p-bh-1",
    storeId: "store-bengal-handloom",
    storeSlug: "bengal-handloom-co",
    categoryId: "cat-bh-jamdani",
    gender: "women",
    subCategory: "Sarees",
    title: "Jamdani Saree — Ivory & Red",
    description: "Handwoven jamdani cotton saree with traditional motifs, sourced from a Shantipur weaver co-op.",
    fabric: "Jamdani Cotton",
    color: "White",
    basePrice: 3799,
    compareAtPrice: 4999,
    images: [{ url: placeholderImage("Jamdani Saree", "#7c2d12", "#fef9c3") }],
    sizes: ["Free Size"],
    stockRemaining: 6,
    createdAt: "2026-08-23",
  },
  {
    id: "p-bh-2",
    storeId: "store-bengal-handloom",
    storeSlug: "bengal-handloom-co",
    categoryId: "cat-bh-tant",
    gender: "women",
    subCategory: "Sarees",
    title: "Tant Cotton Saree — White & Green",
    description: "Classic Bengal tant cotton saree with a woven border, breathable for daily wear.",
    fabric: "Tant Cotton",
    color: "White",
    basePrice: 1299,
    images: [{ url: placeholderImage("Tant Cotton Saree", "#15803d", "#fffdf7") }],
    sizes: ["Free Size"],
    stockRemaining: 20,
    createdAt: "2026-08-29",
  },
  {
    id: "p-bh-3",
    storeId: "store-bengal-handloom",
    storeSlug: "bengal-handloom-co",
    categoryId: "cat-bh-kids",
    gender: "kids",
    subCategory: "Girls",
    title: "Kids Tant Cotton Frock — Yellow",
    description: "Lightweight handloom cotton frock for girls, breathable for daily summer wear.",
    fabric: "Tant Cotton",
    color: "Yellow",
    basePrice: 599,
    compareAtPrice: 799,
    images: [{ url: placeholderImage("Kids Tant Frock", "#b91c1c", "#fef9c3") }],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    stockRemaining: 12,
    createdAt: "2026-09-01",
  },
];
export const products: Product[] = globalThis.__sioProducts ?? (globalThis.__sioProducts = loadPersisted("products", INITIAL_PRODUCTS));

const EARTH_RADIUS_KM = 6371;
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// PIN -> lat/long lookup, standing in for the `pin_codes` reference table.
// Backed by india-post-pincode's offline dataset (~19.5k real Indian PIN
// codes with coordinates averaged from India Post's own office records),
// so every genuine PIN code a shopper types resolves to a real location.
export function resolvePincode(pincode: string): { lat: number; lng: number; city: string } | undefined {
  const hit = lookupPincode(pincode);
  if (!hit || hit.latitude == null || hit.longitude == null) return undefined;
  return { lat: hit.latitude, lng: hit.longitude, city: hit.district };
}

// Cross-store hyperlocal product search — the backbone of "sort and shop in
// sort": a shopper filters once (category, price, size, radius) and shops
// directly from the matching products across every nearby store, rather
// than picking one store first. See docs/01-product-and-personas.md §3.
export function searchProducts(opts: {
  pincode?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  gender?: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  sort?: string;
  q?: string;
}) {
  const { pincode, lat, lng, radiusKm = 10, gender, subCategory, minPrice, maxPrice, size, sort, q } = opts;
  // See discoverStores() above for why raw coordinates take priority.
  const origin = lat != null && lng != null ? { lat, lng } : pincode ? resolvePincode(pincode) : undefined;
  const query = q?.trim().toLowerCase();

  const storesById = new Map(stores.map((s) => [s.id, s]));

  let results = products
    .map((p) => {
      const store = storesById.get(p.storeId)!;
      const distanceKm = origin
        ? Math.round(haversineKm(origin.lat, origin.lng, store.latitude, store.longitude) * 10) / 10
        : null;
      // Fuzzy-matched against title/fabric/category/color so typos
      // ("kurthi"), missing spaces ("bluejeans") and partial words still
      // find the right products, the way a real search engine would.
      const searchScore = query
        ? fuzzyBestScore(query, [p.title, p.fabric, p.subCategory, p.color, p.gender])
        : 0;
      return {
        ...p,
        storeName: store.name,
        storeCity: store.city,
        storeLocalMarket: store.localMarket,
        distanceKm,
        searchScore,
      };
    })
    .filter((p) => storesById.get(p.storeId)?.status === "active")
    .filter((p) => !origin || p.distanceKm === null || p.distanceKm <= radiusKm)
    .filter((p) => !gender || gender === "all" || p.gender === gender)
    .filter((p) => !subCategory || p.subCategory === subCategory)
    .filter((p) => minPrice == null || p.basePrice >= minPrice)
    .filter((p) => maxPrice == null || p.basePrice <= maxPrice)
    .filter((p) => !size || p.sizes.includes(size))
    .filter((p) => !query || p.searchScore > 0);

  if (sort === "price_asc") results = [...results].sort((a, b) => a.basePrice - b.basePrice);
  else if (sort === "price_desc") results = [...results].sort((a, b) => b.basePrice - a.basePrice);
  else if (sort === "newest") results = [...results].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  else if (query) results = [...results].sort((a, b) => b.searchScore - a.searchScore || (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  else results = [...results].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  return results.map(({ searchScore, ...p }) => p);
}


// Featured category tiles for the homepage "Browse by Category" strip.
// Counts are computed live from the seed catalog rather than hardcoded.
export const CATEGORY_TILES: { label: string; gender: Gender; subCategory: string }[] = [
  { label: "Sarees", gender: "women", subCategory: "Sarees" },
  { label: "Kurtis", gender: "women", subCategory: "Kurtis" },
  { label: "Jeans", gender: "men", subCategory: "Jeans" },
  { label: "Kids Wear", gender: "kids", subCategory: "" },
];

export function getCategoryTileCounts() {
  return CATEGORY_TILES.map((tile) => ({
    ...tile,
    count: products.filter((p) => p.gender === tile.gender && (!tile.subCategory || p.subCategory === tile.subCategory)).length,
  }));
}

export function discoverStores(opts: { pincode?: string; lat?: number; lng?: number; radiusKm?: number; gender?: string; subCategory?: string }) {
  const { pincode, lat, lng, radiusKm = 10, gender, subCategory } = opts;
  // Real GPS coordinates (from the browser's Geolocation API) take priority
  // over a typed PIN code when both are somehow present - there's no
  // reverse-geocoding service in this demo to turn coordinates into a PIN
  // code, so distance is computed directly from them instead, the same way
  // haversineKm already works from a resolved PIN code's lat/lng.
  const origin = lat != null && lng != null ? { lat, lng } : pincode ? resolvePincode(pincode) : undefined;

  const matchingStoreIds =
    gender && gender !== "all"
      ? new Set(
          products
            .filter((p) => p.gender === gender)
            .filter((p) => !subCategory || p.subCategory === subCategory)
            .map((p) => p.storeId)
        )
      : null;

  return stores
    .filter((s) => s.status === "active")
    .filter((s) => !matchingStoreIds || matchingStoreIds.has(s.id))
    .map((s) => ({
      ...s,
      distanceKm: origin ? Math.round(haversineKm(origin.lat, origin.lng, s.latitude, s.longitude) * 10) / 10 : null,
    }))
    .filter((s) => !origin || s.distanceKm === null || s.distanceKm <= radiusKm)
    .sort((a, b) => {
      const boosted = Number(isBoostActive(b.boostedUntil)) - Number(isBoostActive(a.boostedUntil));
      if (boosted !== 0) return boosted;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });
}

// Full store directory for the standalone /shops page - unfiltered by
// geography, unlike discoverStores() which is scoped to a shopper's PIN
// code + radius.
export function getAllShops() {
  return stores
    .filter((s) => s.status === "active")
    .map((s) => ({ ...s, productCount: products.filter((p) => p.storeId === s.id).length }))
    .sort((a, b) => Number(isBoostActive(b.boostedUntil)) - Number(isBoostActive(a.boostedUntil)));
}

// ---------------------------------------------------------------------
// Seller Portal: catalog + theme mutations.
// In-memory only (resets on server restart) - stands in for the Catalog
// Service's writes in database/schema.sql (`products`, `theme_configurations`)
// until a real backend exists. Good enough to demo add/edit/delete end to end.
// ---------------------------------------------------------------------
export function createProduct(storeId: string, input: Partial<Product>): Product {
  const store = stores.find((s) => s.id === storeId);
  const product: Product = {
    id: `p-custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storeId,
    storeSlug: store?.slug ?? "",
    categoryId: input.categoryId ?? "cat-custom",
    gender: (input.gender as Gender) ?? "women",
    subCategory: input.subCategory ?? "Other",
    title: input.title ?? "Untitled product",
    description: input.description,
    fabric: input.fabric,
    color: input.color,
    colorGroupId: input.colorGroupId,
    productCode: input.productCode,
    basePrice: input.basePrice ?? 0,
    compareAtPrice: input.compareAtPrice,
    images: input.images?.length ? input.images : [{ url: placeholderImage(input.title ?? "New product", "#334155", "#f1f5f9") }],
    sizes: input.sizes?.length ? input.sizes : ["Free Size"],
    stockRemaining: input.stockRemaining ?? 10,
    createdAt: new Date().toISOString(),
  };
  products.unshift(product);
  persist("products", products);
  return product;
}

export function updateProduct(id: string, patch: Partial<Product>): Product | null {
  const product = products.find((p) => p.id === id);
  if (!product) return null;
  const previousStock = product.stockRemaining;
  Object.assign(product, patch);
  persist("products", products);
  if ("stockRemaining" in patch) notifyWaitlistIfRestocked(product, previousStock);
  return product;
}

export function deleteProduct(id: string): boolean {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  persist("products", products);
  return true;
}

export function getStoreProducts(storeId: string): Product[] {
  return products.filter((p) => p.storeId === storeId);
}

// The other colorways of the same listing (e.g. the "select colors" step
// creating one product per color) - same colorGroupId, same store, not
// itself - so the product page can offer them as swatches.
export function getColorSiblings(product: Product): Product[] {
  if (!product.colorGroupId) return [];
  return products.filter((p) => p.id !== product.id && p.storeId === product.storeId && p.colorGroupId === product.colorGroupId);
}

// Flips a newly-signed-up store from "draft" to "active" once its seller
// finishes the onboarding/KYC flow - draft stores are excluded from every
// shopper-facing search/browse query (see the "active" filters above), so
// this is the one step that actually makes a new merchant visible.
export function activateStore(storeId: string): Store | null {
  const store = stores.find((s) => s.id === storeId);
  if (!store) return null;
  store.status = "active";
  persist("stores", stores);
  return store;
}

export function updateStoreTheme(storeId: string, patch: { primary?: string; accent?: string; heroTitle?: string; heroSubtitle?: string }) {
  const theme = themes[storeId];
  if (!theme) return null;
  if (patch.primary) theme.brand.colors.primary = patch.primary;
  if (patch.accent) theme.brand.colors.accent = patch.accent;
  if (theme.layout.heroCarousel?.[0]) {
    if (patch.heroTitle) theme.layout.heroCarousel[0].title = patch.heroTitle;
    if (patch.heroSubtitle) theme.layout.heroCarousel[0].subtitle = patch.heroSubtitle;
  }
  persist("themes", themes);
  return theme;
}

// Live Sale: lets a merchant flag their store as running a flash sale right
// now, with an end time - shown as a badge on /shops, /store/[slug], and the
// homepage "Stores near you" list so nearby shoppers can catch it in time.
export function setStoreLiveSale(storeId: string, input: { headline: string; discountLabel: string; durationHours: number }) {
  const store = stores.find((s) => s.id === storeId);
  if (!store) return null;
  const now = new Date();
  store.liveSale = {
    headline: input.headline,
    discountLabel: input.discountLabel,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + input.durationHours * 60 * 60 * 1000).toISOString(),
  };
  persist("stores", stores);
  return store.liveSale;
}

export function clearStoreLiveSale(storeId: string) {
  const store = stores.find((s) => s.id === storeId);
  if (!store) return null;
  store.liveSale = null;
  persist("stores", stores);
  return true;
}

export function isLiveSaleActive(liveSale?: LiveSale | null): liveSale is LiveSale {
  return !!liveSale && new Date(liveSale.endsAt).getTime() > Date.now();
}

// ---------------------------------------------------------------------
// Reservations - this platform doesn't sell online; a shopper "sorts"
// (picks out) items near them, then reserves them at one store for a fixed
// window so the seller can hold them for an in-person pickup. Stands in for
// the (not-yet-modeled) reservations table. In-memory only; a shopper's own
// reservation ids are kept client-side in localStorage (lib/reservations.ts)
// since there's no auth to scope a query by.
// ---------------------------------------------------------------------
export interface ReservationItem {
  productId: string;
  title: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export type ReservationStatus = "pending" | "fulfilled" | "cancelled" | "expired";

export interface Reservation {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  items: ReservationItem[];
  total: number;
  shopperName: string;
  shopperPhone: string;
  status: "pending" | "fulfilled" | "cancelled";
  reservedUntil: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioReservations: Reservation[] | undefined;
}
export const reservations: Reservation[] = globalThis.__sioReservations ?? (globalThis.__sioReservations = loadPersisted("reservations", [] as Reservation[]));

export function createReservation(input: {
  storeId: string;
  items: ReservationItem[];
  shopperName: string;
  shopperPhone: string;
  durationMinutes: number;
}): Reservation | null {
  const store = stores.find((s) => s.id === input.storeId);
  if (!store) return null;
  const now = new Date();
  const reservation: Reservation = {
    id: `RSV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    storeId: store.id,
    storeName: store.name,
    storeSlug: store.slug,
    items: input.items,
    total: input.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    shopperName: input.shopperName,
    shopperPhone: input.shopperPhone,
    status: "pending",
    reservedUntil: new Date(now.getTime() + input.durationMinutes * 60_000).toISOString(),
    createdAt: now.toISOString(),
  };
  reservations.unshift(reservation);
  persist("reservations", reservations);

  if (store.phone) {
    const itemCount = reservation.items.reduce((sum, i) => sum + i.quantity, 0);
    notify(store.id, store.phone, "seller", "reservation_created",
      `New reservation from ${reservation.shopperName} (${reservation.shopperPhone}): ${itemCount} item${itemCount === 1 ? "" : "s"}, ₹${reservation.total}. Reserved until ${new Date(reservation.reservedUntil).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`
    );
  }

  return reservation;
}

export function getReservation(id: string): Reservation | undefined {
  return reservations.find((r) => r.id === id);
}

export function getStoreReservations(storeId: string): Reservation[] {
  return reservations.filter((r) => r.storeId === storeId);
}

export function updateReservationStatus(id: string, status: "fulfilled" | "cancelled"): Reservation | null {
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) return null;
  reservation.status = status;
  persist("reservations", reservations);

  const message =
    status === "fulfilled"
      ? `Thanks for shopping with ${reservation.storeName}! Your order (₹${reservation.total}) has been picked up.`
      : `Your reservation at ${reservation.storeName} (₹${reservation.total}) was cancelled.`;
  notify(reservation.storeId, reservation.shopperPhone, "shopper", `reservation_${status}`, message);

  return reservation;
}

// A pending reservation past its window is effectively expired - derived
// rather than stored, so nothing needs to poll and flip it server-side.
export function effectiveReservationStatus(r: Reservation): ReservationStatus {
  if (r.status === "pending" && new Date(r.reservedUntil).getTime() < Date.now()) return "expired";
  return r.status;
}

// ---------------------------------------------------------------------
// Notifications: an SMS/WhatsApp-style log so a reservation actually
// reaches someone (seller told a reservation came in, shopper told
// theirs was fulfilled/cancelled) instead of only living inside this
// dashboard until someone happens to check it. Event-driven only (fires
// from createReservation/updateReservationStatus above) - a real
// "reservation expiring in 30 minutes" reminder would need a scheduled
// job this demo environment has no infrastructure for, so that one isn't
// covered here.
//
// Like lib/otp.ts, only actual SMS delivery is stubbed (no gateway
// credentials exist in this environment) - everything else (who gets
// notified, when, with what message) is real and wired to real events.
// ---------------------------------------------------------------------
export interface Notification {
  id: string;
  storeId: string;
  recipient: "seller" | "shopper";
  phone: string;
  trigger: "reservation_created" | "reservation_fulfilled" | "reservation_cancelled" | "back_in_stock" | "referral_joined";
  message: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioNotifications: Notification[] | undefined;
}

export const notifications: Notification[] = globalThis.__sioNotifications ?? (globalThis.__sioNotifications = loadPersisted("notifications", [] as Notification[]));

function notify(storeId: string, phone: string, recipient: "seller" | "shopper", trigger: Notification["trigger"], message: string) {
  console.log(`[SMS -> +91${phone}] ${message}`);
  const record: Notification = {
    id: `notif-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storeId,
    recipient,
    phone,
    trigger,
    message,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(record);
  persist("notifications", notifications);
}

export function getStoreNotifications(storeId: string): Notification[] {
  return notifications.filter((n) => n.storeId === storeId);
}

// ---------------------------------------------------------------------
// Back-in-stock waitlist: a shopper who hits a sold-out product can ask to
// be told the moment it's restocked, instead of having to keep re-checking.
// Reuses the same notify() SMS-style log used for reservations, so it shows
// up in the shopper's phone the same way a reservation update would.
// ---------------------------------------------------------------------
export interface WaitlistEntry {
  id: string;
  productId: string;
  storeId: string;
  shopperName: string;
  shopperPhone: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioWaitlist: WaitlistEntry[] | undefined;
}

export const waitlist: WaitlistEntry[] = globalThis.__sioWaitlist ?? (globalThis.__sioWaitlist = loadPersisted("waitlist", [] as WaitlistEntry[]));

// Rejects a duplicate join (same phone, same product still waiting) rather
// than silently piling up repeat entries every time an impatient shopper
// re-submits the form.
export function joinWaitlist(productId: string, shopperName: string, shopperPhone: string): { ok: true; entry: WaitlistEntry } | { ok: false; error: string } {
  const product = products.find((p) => p.id === productId);
  if (!product) return { ok: false, error: "Product not found." };
  const normalized = shopperPhone.replace(/\D/g, "").slice(-10);
  const already = waitlist.some((w) => w.productId === productId && w.shopperPhone.replace(/\D/g, "").slice(-10) === normalized);
  if (already) return { ok: false, error: "You're already on the waitlist for this product." };

  const entry: WaitlistEntry = {
    id: `wait-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    productId,
    storeId: product.storeId,
    shopperName: shopperName.trim(),
    shopperPhone: normalized,
    createdAt: new Date().toISOString(),
  };
  waitlist.push(entry);
  persist("waitlist", waitlist);
  return { ok: true, entry };
}

export function getProductWaitlistCount(productId: string): number {
  return waitlist.filter((w) => w.productId === productId).length;
}

// Notifies and clears everyone waiting on a product the moment it goes from
// sold-out to back in stock - called from updateProduct() below, not fired
// on every stock edit (e.g. a seller correcting 8 to 9 shouldn't spam
// anyone who was never actually told "sold out").
function notifyWaitlistIfRestocked(product: Product, previousStock: number | undefined) {
  if ((previousStock ?? 0) > 0 || (product.stockRemaining ?? 0) <= 0) return;
  const waiting = waitlist.filter((w) => w.productId === product.id);
  if (waiting.length === 0) return;
  for (const entry of waiting) {
    notify(product.storeId, entry.shopperPhone, "shopper", "back_in_stock", `Good news - "${product.title}" is back in stock! Reserve it before it sells out again.`);
  }
  const remaining = waitlist.filter((w) => w.productId !== product.id);
  waitlist.length = 0;
  waitlist.push(...remaining);
  persist("waitlist", waitlist);
}

// ---------------------------------------------------------------------
// Shopper profiles: created the first time a phone number completes OTP
// sign-in (see /api/v1/shopper/profile). Lets the sign-in page tell a
// genuinely first-time customer apart from one returning on a new device
// (localStorage-only shopper-session.ts can't do that across devices),
// and gives the platform somewhere to keep the preferences a first-time
// signup collects (preferred category, home area) for later
// personalization.
// ---------------------------------------------------------------------
export interface Shopper {
  id: string;
  name: string;
  phone: string;
  email?: string;
  preferredCategory?: Gender;
  pincode?: string;
  createdAt: string;
  // Referral program - a shareable code every shopper gets on signup (see
  // /account "Invite friends"). No money changes hands (this platform takes
  // no cut of a sale), so the reward is growing the shopper base itself:
  // more shoppers makes a seller's subscription more worth paying for.
  referralCode: string;
  referredBy?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioShoppers: Shopper[] | undefined;
}

export const shoppers: Shopper[] = globalThis.__sioShoppers ?? (globalThis.__sioShoppers = loadPersisted("shoppers", [] as Shopper[]));

export function findShopperByPhone(phone: string): Shopper | null {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  const shopper = shoppers.find((s) => s.phone.replace(/\D/g, "").slice(-10) === normalized) ?? null;
  // Self-healing backfill for a shopper who signed up before the referral
  // program existed, on whichever code path reads them first (OTP verify,
  // profile update, or the referrals endpoint) - not just the update path
  // in upsertShopper, since a returning login never calls that.
  if (shopper && !shopper.referralCode) {
    shopper.referralCode = generateReferralCode(shopper.name);
    persist("shoppers", shoppers);
  }
  return shopper;
}

export function findShopperByReferralCode(code: string): Shopper | null {
  // Guards against shopper records persisted before referralCode existed
  // (this field is new) - those have no code to match against, not a bug.
  return shoppers.find((s) => s.referralCode && s.referralCode.toLowerCase() === code.toLowerCase()) ?? null;
}

export function getReferralCount(shopperId: string): number {
  return shoppers.filter((s) => s.referredBy === shopperId).length;
}

function generateReferralCode(name: string): string {
  const base = (name.replace(/[^A-Za-z]/g, "").slice(0, 5) || "SORT").toUpperCase();
  let code = "";
  do {
    code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  } while (findShopperByReferralCode(code));
  return code;
}

export interface UpsertShopperInput {
  name: string;
  phone: string;
  email?: string;
  preferredCategory?: Gender;
  pincode?: string;
  // Referral code from the invite link (?ref=CODE) the shopper signed up
  // through - only ever applied on first creation, never on a later update.
  referredByCode?: string;
}

// Creates a shopper the first time their phone verifies, or updates the
// existing profile's editable fields on a later sign-in - either way the
// caller gets back the current record plus whether this was a brand-new
// signup, which is what the sign-in page uses to decide whether to show
// the "tell us about you" step.
export function upsertShopper(input: UpsertShopperInput): { shopper: Shopper; isNewCustomer: boolean } {
  const existing = findShopperByPhone(input.phone);
  if (existing) {
    existing.name = input.name.trim() || existing.name;
    if (input.email !== undefined) existing.email = input.email.trim() || undefined;
    if (input.preferredCategory !== undefined) existing.preferredCategory = input.preferredCategory;
    if (input.pincode !== undefined) existing.pincode = input.pincode.trim() || undefined;
    persist("shoppers", shoppers);
    return { shopper: existing, isNewCustomer: false };
  }
  const referrer = input.referredByCode ? findShopperByReferralCode(input.referredByCode) : null;
  const shopper: Shopper = {
    id: `shopper-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    phone: input.phone,
    email: input.email?.trim() || undefined,
    preferredCategory: input.preferredCategory,
    pincode: input.pincode?.trim() || undefined,
    createdAt: new Date().toISOString(),
    referralCode: generateReferralCode(input.name),
    referredBy: referrer?.id,
  };
  shoppers.push(shopper);
  persist("shoppers", shoppers);
  if (referrer) {
    notify(
      "platform",
      referrer.phone,
      "shopper",
      "referral_joined",
      `${shopper.name} just joined SORT IT OUT using your invite link! You've now referred ${getReferralCount(referrer.id)} friend${getReferralCount(referrer.id) === 1 ? "" : "s"}.`
    );
  }
  return { shopper, isNewCustomer: true };
}

// ---------------------------------------------------------------------
// In-store billing: lets a seller record a walk-in sale made in their own
// physical shop as a proper bill/receipt - paid for in cash/UPI/card
// directly to the seller, no money moves through this platform. Deducts
// from the same `stockRemaining` every online listing already shows, so a
// counter sale is reflected online immediately instead of a shopper being
// able to reserve something that was just sold in person. Distinct from
// the "Billing: plans, subscriptions" section below, which is what THIS
// platform charges the seller - this section is what the seller charges
// THEIR OWN customers.
// ---------------------------------------------------------------------
export interface BillingSettings {
  mode: "gst" | "normal";
  gstin?: string;
  // A single flat rate applied in "gst" mode - real GST has different
  // slabs (5/12/18%) per garment category and price point, which is a
  // full tax-classification system in itself. A configurable flat rate is
  // the honest middle ground for a small shop that mostly sells in one
  // slab, without this pretending to be a full compliance product.
  taxRatePercent: number;
  nextInvoiceNumber: number;
  // Free-text line printed at the foot of every invoice (e.g. an exchange
  // policy, a thank-you note) - seller-authored, since this platform has
  // no basis to assert a shop's own return/exchange terms on their behalf.
  invoiceNote?: string;
}

export interface BillItem {
  productId: string;
  title: string;
  // Stock isn't tracked per-size in this catalog (Product.stockRemaining is
  // one shared count across every size) - this is recorded purely so the
  // seller's own bill/receipt reflects which size actually left the shop,
  // not to enforce a per-size stock limit that doesn't exist.
  size?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  storeId: string;
  storeName: string;
  // Snapshotted at creation, same as mode/gstin/taxRatePercent below - a
  // store's own address/note can change later and must never rewrite what
  // already printed on a customer's copy.
  storeAddress?: string;
  invoiceNote?: string;
  mode: "gst" | "normal";
  gstin?: string;
  taxRatePercent: number;
  items: BillItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  totalQuantity: number;
  paymentMode: "cash" | "upi" | "card" | "other";
  customerName?: string;
  customerPhone?: string;
  status: "issued" | "void";
  voidReason?: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioBillingSettings: Record<string, BillingSettings> | undefined;
  // eslint-disable-next-line no-var
  var __sioBills: Bill[] | undefined;
}

const DEFAULT_BILLING_SETTINGS: Omit<BillingSettings, "nextInvoiceNumber"> = { mode: "normal", taxRatePercent: 5 };

export const billingSettingsStore: Record<string, BillingSettings> =
  globalThis.__sioBillingSettings ?? (globalThis.__sioBillingSettings = loadPersisted("billingSettings", {} as Record<string, BillingSettings>));

export function getBillingSettings(storeId: string): BillingSettings {
  return billingSettingsStore[storeId] ?? { ...DEFAULT_BILLING_SETTINGS, nextInvoiceNumber: 1 };
}

export function updateBillingSettings(
  storeId: string,
  patch: { mode?: "gst" | "normal"; gstin?: string; taxRatePercent?: number; invoiceNote?: string }
): BillingSettings {
  const current = getBillingSettings(storeId);
  const next: BillingSettings = {
    ...current,
    ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
    ...(patch.gstin !== undefined ? { gstin: patch.gstin } : {}),
    ...(patch.taxRatePercent !== undefined ? { taxRatePercent: patch.taxRatePercent } : {}),
    ...(patch.invoiceNote !== undefined ? { invoiceNote: patch.invoiceNote } : {}),
  };
  billingSettingsStore[storeId] = next;
  persist("billingSettings", billingSettingsStore);
  return next;
}

export const bills: Bill[] = globalThis.__sioBills ?? (globalThis.__sioBills = loadPersisted("bills", [] as Bill[]));

export type CreateBillResult = { bill: Bill } | { error: string };

export function createBill(input: {
  storeId: string;
  items: { productId: string; quantity: number; size?: string }[];
  paymentMode: "cash" | "upi" | "card" | "other";
  customerName?: string;
  customerPhone?: string;
}): CreateBillResult {
  const store = stores.find((s) => s.id === input.storeId);
  if (!store) return { error: "Store not found." };
  if (input.items.length === 0) return { error: "Add at least one product to the bill." };

  // Resolve and validate every line before mutating any stock, so a bill
  // either goes through completely or not at all - never half-deducted.
  const resolved: { product: Product; quantity: number; size?: string }[] = [];
  for (const line of input.items) {
    const product = products.find((p) => p.id === line.productId && p.storeId === input.storeId);
    if (!product) return { error: `Product ${line.productId} not found in this store.` };
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      return { error: `Invalid quantity for "${product.title}".` };
    }
    if (line.size !== undefined && product.sizes.length > 0 && !product.sizes.includes(line.size)) {
      return { error: `"${line.size}" isn't a valid size for "${product.title}".` };
    }
    const available = product.stockRemaining ?? 0;
    if (line.quantity > available) {
      return { error: `Only ${available} left in stock for "${product.title}".` };
    }
    resolved.push({ product, quantity: line.quantity, size: line.size });
  }

  for (const { product, quantity } of resolved) {
    product.stockRemaining = (product.stockRemaining ?? 0) - quantity;
  }
  persist("products", products);

  const items: BillItem[] = resolved.map(({ product, quantity, size }) => ({
    productId: product.id,
    title: product.title,
    size,
    quantity,
    unitPrice: product.basePrice,
    total: product.basePrice * quantity,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

  const settings = getBillingSettings(input.storeId);
  const isGst = settings.mode === "gst";
  const taxRatePercent = isGst ? settings.taxRatePercent : 0;
  const totalTax = isGst ? Math.round(subtotal * taxRatePercent) / 100 : 0;
  const cgst = Math.round(totalTax * 50) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;
  const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

  const invoiceNumber = `${isGst ? "GST" : "RCPT"}-${String(settings.nextInvoiceNumber).padStart(5, "0")}`;
  billingSettingsStore[input.storeId] = { ...settings, nextInvoiceNumber: settings.nextInvoiceNumber + 1 };
  persist("billingSettings", billingSettingsStore);

  const bill: Bill = {
    id: `bill-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    invoiceNumber,
    storeId: store.id,
    storeName: store.name,
    storeAddress: [store.localMarket, store.city].filter(Boolean).join(", ") + (store.pincode ? ` - ${store.pincode}` : ""),
    invoiceNote: settings.invoiceNote,
    mode: settings.mode,
    gstin: isGst ? settings.gstin : undefined,
    taxRatePercent,
    items,
    subtotal,
    cgst,
    sgst,
    grandTotal,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    paymentMode: input.paymentMode,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    status: "issued",
    createdAt: new Date().toISOString(),
  };
  bills.unshift(bill);
  persist("bills", bills);
  return { bill };
}

export function getBill(id: string): Bill | undefined {
  return bills.find((b) => b.id === id);
}

export function getStoreBills(storeId: string): Bill[] {
  return bills.filter((b) => b.storeId === storeId);
}

// Restocks every line item - a void means the sale didn't actually happen
// (rung up by mistake, or a full return), so the stock deducted at billing
// time needs to come back for online listings to stay accurate. An
// already-void bill can't be voided again.
export function voidBill(id: string, reason: string): Bill | null {
  const bill = bills.find((b) => b.id === id);
  if (!bill || bill.status === "void") return null;
  for (const item of bill.items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) product.stockRemaining = (product.stockRemaining ?? 0) + item.quantity;
  }
  persist("products", products);
  bill.status = "void";
  bill.voidReason = reason;
  persist("bills", bills);
  return bill;
}

// ---------------------------------------------------------------------
// Billing: plans, subscriptions, GST invoices - matches
// docs/04-monetization-and-billing.md and the `plans`/`subscriptions`/
// `gst_invoices` tables in database/schema.sql. No real PSP (Razorpay/
// Cashfree) is called - "subscribing" just flips the in-memory plan.
// ---------------------------------------------------------------------
export interface Plan {
  code: "lite" | "pro" | "max";
  name: string;
  skuLimit: number;
  monthlyPrice: number;
  features: string[];
}

export const PLANS: Plan[] = [
  { code: "lite", name: "Lite", skuLimit: 100, monthlyPrice: 499, features: ["1 theme", "Path-based URL", "Basic analytics"] },
  {
    code: "pro",
    name: "Pro",
    skuLimit: 2500,
    monthlyPrice: 1999,
    features: ["Full Theme Studio", "Subdomain", "QR standee generator", "WhatsApp notifications"],
  },
  {
    code: "max",
    name: "Max",
    skuLimit: 25000,
    monthlyPrice: 6999,
    features: ["Custom domain", "Multi-store", "Bulk CSV import", "Priority search ranking"],
  },
];

interface Subscription {
  storeId: string;
  planCode: Plan["code"];
  status: "active" | "past_due";
  currentPeriodEnd: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioSubscriptions: Record<string, Subscription> | undefined;
}

const INITIAL_SUBSCRIPTIONS: Record<string, Subscription> = {
  "store-urban-vogue": { storeId: "store-urban-vogue", planCode: "pro", status: "active", currentPeriodEnd: futureDate(18) },
  "store-south-silk-house": { storeId: "store-south-silk-house", planCode: "lite", status: "active", currentPeriodEnd: futureDate(9) },
  "store-denim-district": { storeId: "store-denim-district", planCode: "max", status: "active", currentPeriodEnd: futureDate(25) },
};
export const subscriptions: Record<string, Subscription> = globalThis.__sioSubscriptions ?? (globalThis.__sioSubscriptions = loadPersisted("subscriptions", INITIAL_SUBSCRIPTIONS));

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function getSubscription(storeId: string): Subscription {
  return subscriptions[storeId] ?? { storeId, planCode: "lite", status: "active", currentPeriodEnd: futureDate(30) };
}

export function changePlan(storeId: string, planCode: Plan["code"]): Subscription | null {
  if (!PLANS.some((p) => p.code === planCode)) return null;
  const sub = getSubscription(storeId);
  sub.planCode = planCode;
  sub.status = "active";
  subscriptions[storeId] = sub;
  persist("subscriptions", subscriptions);
  return sub;
}

// ---------------------------------------------------------------------
// Store Boost: a direct answer to "how do I make money from traffic" - a
// seller can pay to rank first in "Stores near you" and /shops for a fixed
// window, turning the platform's one non-subscription revenue lever. Same
// "flip an in-memory flag, no real payment processor" convention as
// changePlan()/photo credits - a real deployment would redirect to a
// payment gateway's checkout here instead.
// ---------------------------------------------------------------------
export interface BoostPackage {
  days: number;
  price: number;
  label: string;
}

export const BOOST_PACKAGES: BoostPackage[] = [
  { days: 3, price: 149, label: "3 days" },
  { days: 7, price: 299, label: "7 days" },
  { days: 30, price: 899, label: "30 days" },
];

export function isBoostActive(boostedUntil?: string | null): boolean {
  return !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
}

export function boostStore(storeId: string, days: number): Store | null {
  const store = stores.find((s) => s.id === storeId);
  if (!store) return null;
  // Stacks onto any remaining boosted time rather than overwriting it, so
  // buying another package before the current one expires extends it
  // instead of wasting the days already paid for.
  const base = isBoostActive(store.boostedUntil) ? new Date(store.boostedUntil!).getTime() : Date.now();
  store.boostedUntil = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  persist("stores", stores);
  return store;
}

// ---------------------------------------------------------------------
// AI Photo Credits: the Gemini-based mannequin-placement step (unlike free
// client-side background removal) is a real per-call cost to whoever's
// paying the Google Cloud bill, so it's metered separately from SKU-based
// subscription plans. A store spends 1 credit per successful enhancement;
// "purchasing" a pack here is the same kind of demo stand-in as
// changePlan()/billing subscribe - it flips the in-memory balance with no
// real payment processor call. A real deployment would redirect to
// Razorpay/Cashfree checkout here, same as billing/subscribe.
// ---------------------------------------------------------------------
export interface PhotoCreditPackage {
  id: string;
  credits: number;
  priceInr: number;
}

export const PHOTO_CREDIT_PACKAGES: PhotoCreditPackage[] = [
  { id: "pack-10", credits: 10, priceInr: 39 },
  { id: "pack-50", credits: 50, priceInr: 179 },
  { id: "pack-200", credits: 200, priceInr: 649 },
];

declare global {
  // eslint-disable-next-line no-var
  var __sioPhotoCredits: Record<string, number> | undefined;
}

// New stores start with a few free credits so sellers can try the paid
// mannequin step once before deciding whether to buy more.
const STARTER_PHOTO_CREDITS = 3;

export const photoCredits: Record<string, number> =
  globalThis.__sioPhotoCredits ?? (globalThis.__sioPhotoCredits = loadPersisted("photoCredits", {} as Record<string, number>));

export function getPhotoCredits(storeId: string): number {
  return photoCredits[storeId] ?? STARTER_PHOTO_CREDITS;
}

export function spendPhotoCredit(storeId: string): boolean {
  const balance = getPhotoCredits(storeId);
  if (balance <= 0) return false;
  photoCredits[storeId] = balance - 1;
  persist("photoCredits", photoCredits);
  return true;
}

export function buyPhotoCredits(storeId: string, packageId: string): number | null {
  const pack = PHOTO_CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pack) return null;
  const balance = getPhotoCredits(storeId);
  photoCredits[storeId] = balance + pack.credits;
  persist("photoCredits", photoCredits);
  return photoCredits[storeId];
}

// Platform is registered in Maharashtra (state code 27) for this demo -
// mirrors fn_compute_gst_split() in database/schema.sql.
const PLATFORM_STATE_CODE = "27";
const GST_RATE = 18;

export interface GstInvoice {
  id: string;
  storeId: string;
  planCode: string;
  taxableValue: number;
  placeOfSupplyStateCode: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  issuedAt: string;
}

function computeGstInvoice(storeId: string, taxableValue: number, placeOfSupplyStateCode: string, issuedAt: string): GstInvoice {
  const sameState = placeOfSupplyStateCode === PLATFORM_STATE_CODE;
  const cgst = sameState ? Math.round((taxableValue * GST_RATE) / 200) : 0;
  const sgst = sameState ? Math.round((taxableValue * GST_RATE) / 200) : 0;
  const igst = sameState ? 0 : Math.round((taxableValue * GST_RATE) / 100);
  return {
    id: `INV-${new Date(issuedAt).getFullYear()}-${Math.abs(hashCode(storeId + issuedAt)) % 100000}`,
    storeId,
    planCode: subscriptions[storeId]?.planCode ?? "lite",
    taxableValue,
    placeOfSupplyStateCode,
    cgst,
    sgst,
    igst,
    total: taxableValue + cgst + sgst + igst,
    issuedAt,
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

// Maharashtra (Urban Vogue) -> CGST+SGST; Tamil Nadu & Karnataka -> IGST.
const STORE_STATE_CODES: Record<string, string> = {
  "store-urban-vogue": "27",
  "store-south-silk-house": "33",
  "store-denim-district": "29",
};

export function getInvoicesForStore(storeId: string): GstInvoice[] {
  const plan = PLANS.find((p) => p.code === getSubscription(storeId).planCode) ?? PLANS[0];
  const stateCode = STORE_STATE_CODES[storeId] ?? PLATFORM_STATE_CODE;
  return [1, 2, 3].map((monthsAgo) =>
    computeGstInvoice(storeId, plan.monthlyPrice, stateCode, new Date(Date.now() - monthsAgo * 30 * 24 * 60 * 60 * 1000).toISOString())
  );
}

// ---------------------------------------------------------------------
// Analytics: mirrors `store_analytics_events` in database/schema.sql.
// Tracks page views (with src/pos query params, for QR-vs-online
// attribution per docs/03-multi-tenant-storefront.md §4) so the Seller
// Portal's Analytics tab has real numbers instead of placeholders.
// ---------------------------------------------------------------------
export interface AnalyticsEvent {
  storeId: string;
  eventType: "page_view" | "qr_scan";
  qrPosition?: string;
  occurredAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioAnalyticsEvents: AnalyticsEvent[] | undefined;
}

export const analyticsEvents: AnalyticsEvent[] = globalThis.__sioAnalyticsEvents ?? (globalThis.__sioAnalyticsEvents = loadPersisted("analyticsEvents", [] as AnalyticsEvent[]));

// Hard cap independent of the API route's rate limiting - keeps memory and
// the persisted db.json bounded even if that limit is bypassed (e.g. spread
// across many IPs), by dropping the oldest events once the log gets large.
const MAX_ANALYTICS_EVENTS = 20_000;

export function trackPageView(storeId: string, qrPosition?: string) {
  const now = new Date().toISOString();
  analyticsEvents.push({ storeId, eventType: "page_view", occurredAt: now });
  if (qrPosition) analyticsEvents.push({ storeId, eventType: "qr_scan", qrPosition, occurredAt: now });
  if (analyticsEvents.length > MAX_ANALYTICS_EVENTS) {
    analyticsEvents.splice(0, analyticsEvents.length - MAX_ANALYTICS_EVENTS);
  }
  persist("analyticsEvents", analyticsEvents);
}

export function getStoreAnalytics(storeId: string) {
  const events = analyticsEvents.filter((e) => e.storeId === storeId);
  const pageViews = events.filter((e) => e.eventType === "page_view");
  const qrScans = events.filter((e) => e.eventType === "qr_scan");

  const byPosition: Record<string, number> = {};
  for (const e of qrScans) {
    const key = e.qrPosition ?? "Unknown";
    byPosition[key] = (byPosition[key] ?? 0) + 1;
  }

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const count = events.filter((e) => e.occurredAt.slice(0, 10) === key).length;
    return { date: key, count };
  });

  return {
    totalPageViews: pageViews.length,
    totalQrScans: qrScans.length,
    onlineViews: pageViews.length - qrScans.length,
    byPosition,
    last7Days,
  };
}

// Revenue/sales analytics, computed from the in-store billing data (see
// createBill) rather than the footfall-only analytics above - a separate
// function/route since the two answer different questions ("who's looking"
// vs. "who's actually buying") and existed independently before this was
// added.
export function getSalesAnalytics(storeId: string) {
  // Void bills didn't result in an actual sale - excluded from every
  // figure here, same as they'd be excluded from a real books/ledger view.
  const storeBills = getStoreBills(storeId).filter((b) => b.status === "issued");

  const totalRevenue = storeBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalBills = storeBills.length;
  const billQuantity = (b: Bill) => b.totalQuantity ?? b.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalItemsSold = storeBills.reduce((sum, b) => sum + billQuantity(b), 0);

  const revenueByProduct = new Map<string, { title: string; quantity: number; revenue: number }>();
  for (const bill of storeBills) {
    for (const item of bill.items) {
      const existing = revenueByProduct.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.total;
      } else {
        revenueByProduct.set(item.productId, { title: item.title, quantity: item.quantity, revenue: item.total });
      }
    }
  }
  const topProducts = [...revenueByProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const dayBills = storeBills.filter((b) => b.createdAt.slice(0, 10) === key);
    return { date: key, revenue: dayBills.reduce((sum, b) => sum + b.grandTotal, 0), count: dayBills.length };
  });

  const byPaymentMode: Record<string, number> = {};
  for (const bill of storeBills) {
    byPaymentMode[bill.paymentMode] = (byPaymentMode[bill.paymentMode] ?? 0) + 1;
  }

  // A customer counts as "repeat" once their phone number shows up on 2+
  // separate bills - the only identity a walk-in customer has here.
  const billsPerPhone = new Map<string, number>();
  for (const bill of storeBills) {
    if (!bill.customerPhone) continue;
    billsPerPhone.set(bill.customerPhone, (billsPerPhone.get(bill.customerPhone) ?? 0) + 1);
  }
  const repeatCustomers = [...billsPerPhone.values()].filter((count) => count >= 2).length;

  return { totalRevenue, totalBills, totalItemsSold, topProducts, last7Days, byPaymentMode, repeatCustomers };
}

// ---------------------------------------------------------------------
// Product reviews & similar products - powers the product detail page.
// ---------------------------------------------------------------------
export interface Review {
  id: string;
  productId: string;
  authorName: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __sioReviews: Review[] | undefined;
}

const SEED_REVIEWS: Review[] = [
  {
    id: "rev-1",
    productId: "p-uv-1",
    authorName: "Priya S.",
    rating: 5,
    title: "Gorgeous saree, exactly as pictured",
    comment: "The zari work is stunning and the fabric drapes beautifully. Got so many compliments at a wedding. Delivery from the store was quick too.",
    verifiedPurchase: true,
    createdAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "rev-2",
    productId: "p-uv-1",
    authorName: "Ananya R.",
    rating: 4,
    title: "Beautiful but runs slightly heavy",
    comment: "Color and border are exactly as shown. Only reason for 4 stars is the saree is a bit heavier than I expected, but great for winter functions.",
    verifiedPurchase: true,
    createdAt: "2026-08-22T14:30:00.000Z",
  },
  {
    id: "rev-3",
    productId: "p-uv-2",
    authorName: "Meera K.",
    rating: 5,
    title: "Perfect everyday kurti",
    comment: "Very comfortable cotton fabric, true to size, and the mustard color is vibrant without being loud. Ordering another one in a different color.",
    verifiedPurchase: true,
    createdAt: "2026-08-10T09:15:00.000Z",
  },
  {
    id: "rev-4",
    productId: "p-uv-2",
    authorName: "Kavya J.",
    rating: 4,
    comment: "Good quality for the price. Embroidery on the yoke is neat. Runs true to size.",
    verifiedPurchase: false,
    createdAt: "2026-08-29T18:45:00.000Z",
  },
  {
    id: "rev-5",
    productId: "p-dd-1",
    authorName: "Rohan M.",
    rating: 5,
    title: "Best fit I've found",
    comment: "Finally a slim fit that doesn't feel restrictive. The stretch fabric moves with you. Ordered a second pair in a different wash.",
    verifiedPurchase: true,
    createdAt: "2026-08-18T11:20:00.000Z",
  },
  {
    id: "rev-6",
    productId: "p-dd-1",
    authorName: "Arjun P.",
    rating: 3,
    comment: "Decent jeans but the color faded slightly after the second wash. Fit is great though.",
    verifiedPurchase: true,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: "rev-7",
    productId: "p-ssh-1",
    authorName: "Lakshmi V.",
    rating: 5,
    title: "Authentic Kanjivaram quality",
    comment: "You can tell this is genuine pure silk - the weight, the sheen, the zari. Worth every rupee. Packaging was also very secure.",
    verifiedPurchase: true,
    createdAt: "2026-08-12T16:00:00.000Z",
  },
  {
    id: "rev-8",
    productId: "p-ccs-1",
    authorName: "Simran K.",
    rating: 5,
    title: "Wholesale-market quality, retail convenience",
    comment: "Reserved it online and picked it up the same evening - the zari work is even better in person. Great for my sister's reception.",
    verifiedPurchase: true,
    createdAt: "2026-08-27T12:10:00.000Z",
  },
  {
    id: "rev-9",
    productId: "p-ccs-2",
    authorName: "Neha A.",
    rating: 4,
    comment: "Lightweight and easy to drape for daily office wear. Color is slightly brighter in person than the photo, in a good way.",
    verifiedPurchase: false,
    createdAt: "2026-09-02T09:40:00.000Z",
  },
  {
    id: "rev-10",
    productId: "p-cz-1",
    authorName: "Fatima S.",
    rating: 5,
    title: "Heirloom-quality zardozi",
    comment: "The pearl and zardozi work is hand-done and it shows. Tried it on at the store before deciding - fit exactly as expected.",
    verifiedPurchase: true,
    createdAt: "2026-08-19T15:20:00.000Z",
  },
  {
    id: "rev-11",
    productId: "p-cz-2",
    authorName: "Ayesha M.",
    rating: 4,
    comment: "Beautiful embroidery on the neckline. Runs slightly large, so size down if you're between sizes.",
    verifiedPurchase: true,
    createdAt: "2026-08-30T17:05:00.000Z",
  },
  {
    id: "rev-12",
    productId: "p-ss-1",
    authorName: "Karthik R.",
    rating: 5,
    title: "Comfortable all day on campus",
    comment: "Cushioning is great for walking between classes all day. Sizing runs true - ordered my usual size and it fit perfectly.",
    verifiedPurchase: true,
    createdAt: "2026-08-24T13:30:00.000Z",
  },
  {
    id: "rev-13",
    productId: "p-ss-2",
    authorName: "Vivek T.",
    rating: 4,
    comment: "Really warm and the oversized fit is exactly what I wanted. Fabric feels slightly thinner than expected for the price.",
    verifiedPurchase: false,
    createdAt: "2026-09-03T10:15:00.000Z",
  },
  {
    id: "rev-14",
    productId: "p-bh-1",
    authorName: "Ritika D.",
    rating: 5,
    title: "Genuine handloom, worth the trip",
    comment: "You can feel the difference from machine-made jamdani immediately. Reserved it and the shopkeeper had it ready with the blouse piece matched.",
    verifiedPurchase: true,
    createdAt: "2026-08-21T11:45:00.000Z",
  },
  {
    id: "rev-15",
    productId: "p-bh-2",
    authorName: "Sohini B.",
    rating: 5,
    comment: "My go-to for everyday tant sarees now. Breathable even in Kolkata's humidity, and the border doesn't fray after multiple washes.",
    verifiedPurchase: true,
    createdAt: "2026-08-31T08:50:00.000Z",
  },
];

export const reviews: Review[] = globalThis.__sioReviews ?? (globalThis.__sioReviews = loadPersisted("reviews", SEED_REVIEWS));

export function getProductReviews(productId: string): Review[] {
  return reviews.filter((r) => r.productId === productId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getRatingSummary(productId: string) {
  const productReviews = getProductReviews(productId);
  const count = productReviews.length;
  const average = count === 0 ? 0 : Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: productReviews.filter((r) => r.rating === star).length,
  }));
  return { average, count, breakdown };
}

// A trust signal for the store as a whole (like a shop's Google rating),
// not just one product - important on a marketplace of many small, mostly
// unknown-to-the-shopper sellers, where "is this shop reliable" matters as
// much as "is this specific item good". Aggregates every review left on
// any of the store's products rather than requiring a separate per-store
// review flow.
export function getStoreRatingSummary(storeId: string): { average: number; count: number } {
  const storeProductIds = new Set(getStoreProducts(storeId).map((p) => p.id));
  const storeReviews = reviews.filter((r) => storeProductIds.has(r.productId));
  const count = storeReviews.length;
  const average = count === 0 ? 0 : Math.round((storeReviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;
  return { average, count };
}

export function addReview(productId: string, input: { authorName: string; rating: number; title?: string; comment: string }): Review {
  const review: Review = {
    id: `rev-custom-${Date.now().toString(36)}`,
    productId,
    authorName: input.authorName || "Anonymous",
    rating: Math.min(5, Math.max(1, input.rating)),
    title: input.title,
    comment: input.comment,
    verifiedPurchase: false,
    createdAt: new Date().toISOString(),
  };
  reviews.unshift(review);
  persist("reviews", reviews);
  return review;
}

// Similar products - same gender + subCategory, excluding the product itself,
// nearest-priced first so recommendations feel relevant rather than random.
export function getSimilarProducts(productId: string, limit = 4) {
  const product = products.find((p) => p.id === productId);
  if (!product) return [];

  const storesById = new Map(stores.map((s) => [s.id, s]));

  return products
    .filter((p) => p.id !== productId)
    .filter((p) => p.gender === product.gender && p.subCategory === product.subCategory)
    .filter((p) => storesById.get(p.storeId)?.status === "active")
    .sort((a, b) => Math.abs(a.basePrice - product.basePrice) - Math.abs(b.basePrice - product.basePrice))
    .slice(0, limit)
    .map((p) => ({ ...p, storeName: storesById.get(p.storeId)?.name ?? "" }));
}

// A subcategory is either "the outfit" or "the accessory" for its gender -
// "Complete the Look" pulls from whichever side the viewed product ISN'T
// on, turning nearby competing sellers into complementary upsell partners
// instead of alternatives to the same purchase (see getSimilarProducts).
const ACCESSORY_SUBCATEGORIES: Record<Gender, string[]> = {
  women: ["Footwear", "Jewellery & Accessories", "Handbags"],
  men: ["Footwear", "Accessories"],
  kids: ["Kids Footwear"],
};

// Cross-seller, not cross-store-of-your-own - deliberately excludes the
// viewed product's own store so a shopper is pointed at a *different*
// nearby seller, not more of the same one. Tries the exact local market
// first (genuinely walkable), falls back to the same city, then anywhere
// on the platform - a real deployment with many sellers per market would
// rarely need to fall back past the first tier; this one seed store per
// market/city does, every time, so the fallback is what actually makes the
// section appear at all in this demo.
export function getComplementaryProducts(productId: string, limit = 4) {
  const product = products.find((p) => p.id === productId);
  if (!product) return [];
  const store = stores.find((s) => s.id === product.storeId);
  if (!store) return [];

  const targetSubcats = ACCESSORY_SUBCATEGORIES[product.gender].includes(product.subCategory)
    ? CATEGORY_TREE.find((c) => c.value === product.gender)!.subCategories.filter((sc) => !ACCESSORY_SUBCATEGORIES[product.gender].includes(sc))
    : ACCESSORY_SUBCATEGORIES[product.gender];

  const storesById = new Map(stores.map((s) => [s.id, s]));
  const candidates = products
    .filter((p) => p.storeId !== product.storeId)
    .filter((p) => p.gender === product.gender && targetSubcats.includes(p.subCategory))
    .filter((p) => storesById.get(p.storeId)?.status === "active")
    .map((p) => ({ ...p, storeName: storesById.get(p.storeId)?.name ?? "", _otherStore: storesById.get(p.storeId) }));

  const tiers = [
    candidates.filter((p) => p._otherStore?.localMarket === store.localMarket),
    candidates.filter((p) => p._otherStore?.city === store.city),
    candidates,
  ];
  const pool = tiers.find((t) => t.length > 0) ?? [];
  return pool.slice(0, limit).map(({ _otherStore, ...p }) => p);
}

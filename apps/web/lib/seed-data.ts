// In-memory seed data standing in for the Tenant/Catalog/Search microservices
// during local development. Every /api/v1/* route reads from this module.
// Swap this file for real service calls once the backend exists — the shape
// mirrors database/schema.sql exactly so the swap is mechanical.

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
  var __sioOrders: Order[] | undefined;
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
];
export const stores: Store[] = globalThis.__sioStores ?? (globalThis.__sioStores = INITIAL_STORES);

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
          ctaLabel: "Shop Festive Wear",
          ctaLink: "/store/urban-vogue",
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
          ctaLabel: "Explore Silk Sarees",
          ctaLink: "/store/south-silk-house",
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
          ctaLabel: "Shop New Denim",
          ctaLink: "/store/denim-district",
        },
      ],
      featuredCollection: { title: "Fresh Fits", maxItems: 8 },
    },
  },
};
export const themes: Record<string, any> = globalThis.__sioThemes ?? (globalThis.__sioThemes = INITIAL_THEMES);

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
};

export type Gender = "men" | "women" | "kids";

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
    basePrice: 999,
    images: [{ url: placeholderImage("Kids Dungaree", "#1e40af", "#dbeafe") }],
    sizes: ["2-3Y", "4-5Y", "6-7Y"],
    stockRemaining: 14,
    createdAt: "2026-09-02",
  },
];
export const products: Product[] = globalThis.__sioProducts ?? (globalThis.__sioProducts = INITIAL_PRODUCTS);

const EARTH_RADIUS_KM = 6371;
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Minimal PIN -> lat/long lookup standing in for the `pin_codes` reference table.
export const pinCodeIndex: Record<string, { lat: number; lng: number; city: string }> = {
  "400050": { lat: 19.0596, lng: 72.8295, city: "Mumbai" },
  "600017": { lat: 13.0418, lng: 80.2341, city: "Chennai" },
  "560001": { lat: 12.9822, lng: 77.6086, city: "Bengaluru" },
  "110006": { lat: 28.6506, lng: 77.2303, city: "Delhi (Chandni Chowk)" },
};

// Cross-store hyperlocal product search — the backbone of "sort and shop in
// sort": a shopper filters once (category, price, size, radius) and shops
// directly from the matching products across every nearby store, rather
// than picking one store first. See docs/01-product-and-personas.md §3.
export function searchProducts(opts: {
  pincode?: string;
  radiusKm?: number;
  gender?: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  sort?: string;
  q?: string;
}) {
  const { pincode, radiusKm = 10, gender, subCategory, minPrice, maxPrice, size, sort, q } = opts;
  const origin = pincode ? pinCodeIndex[pincode] : undefined;
  const query = q?.trim().toLowerCase();

  const storesById = new Map(stores.map((s) => [s.id, s]));

  let results = products
    .map((p) => {
      const store = storesById.get(p.storeId)!;
      const distanceKm = origin
        ? Math.round(haversineKm(origin.lat, origin.lng, store.latitude, store.longitude) * 10) / 10
        : null;
      return {
        ...p,
        storeName: store.name,
        storeCity: store.city,
        storeLocalMarket: store.localMarket,
        distanceKm,
      };
    })
    .filter((p) => storesById.get(p.storeId)?.status === "active")
    .filter((p) => !origin || p.distanceKm === null || p.distanceKm <= radiusKm)
    .filter((p) => !gender || gender === "all" || p.gender === gender)
    .filter((p) => !subCategory || p.subCategory === subCategory)
    .filter((p) => minPrice == null || p.basePrice >= minPrice)
    .filter((p) => maxPrice == null || p.basePrice <= maxPrice)
    .filter((p) => !size || p.sizes.includes(size))
    .filter((p) => !query || p.title.toLowerCase().includes(query) || p.fabric?.toLowerCase().includes(query));

  if (sort === "price_asc") results = [...results].sort((a, b) => a.basePrice - b.basePrice);
  else if (sort === "price_desc") results = [...results].sort((a, b) => b.basePrice - a.basePrice);
  else if (sort === "newest") results = [...results].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  else results = [...results].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  return results;
}

export const ALL_SIZES = ["S", "M", "L", "XL", "XXL", "Free Size", "30", "32", "34", "36", "2-3Y", "4-5Y", "6-7Y", "8-9Y"];

// Two-level nav taxonomy: gender (top-level tab) -> subCategory (product-level
// attribute). Mirrors what `product_categories` + a `gender` facet would look
// like as a real per-tenant catalog taxonomy (docs/03-multi-tenant-storefront.md).
export const CATEGORY_TREE: { label: string; value: Gender; subCategories: string[] }[] = [
  { label: "Men", value: "men", subCategories: ["Jeans", "Jackets", "Shirts", "T-Shirts"] },
  { label: "Women", value: "women", subCategories: ["Sarees", "Kurtis", "Lehengas", "Western Wear"] },
  { label: "Kids", value: "kids", subCategories: ["Boys", "Girls", "Infant"] },
];

// Featured category tiles for the homepage "Browse by Category" strip.
// Counts are computed live from the seed catalog rather than hardcoded.
export const CATEGORY_TILES: { label: string; gender: Gender; subCategory: string; icon: string; bg: string; fg: string }[] = [
  { label: "Sarees", gender: "women", subCategory: "Sarees", icon: "👗", bg: "#fde2e7", fg: "#9d174d" },
  { label: "Kurtis", gender: "women", subCategory: "Kurtis", icon: "👚", bg: "#ffe8d6", fg: "#9a3412" },
  { label: "Jeans", gender: "men", subCategory: "Jeans", icon: "👖", bg: "#fef3c7", fg: "#92400e" },
  { label: "Kids Wear", gender: "kids", subCategory: "", icon: "🧸", bg: "#d6f0ee", fg: "#0f766e" },
];

export function getCategoryTileCounts() {
  return CATEGORY_TILES.map((tile) => ({
    ...tile,
    count: products.filter((p) => p.gender === tile.gender && (!tile.subCategory || p.subCategory === tile.subCategory)).length,
  }));
}

export function discoverStores(opts: { pincode?: string; radiusKm?: number; gender?: string; subCategory?: string }) {
  const { pincode, radiusKm = 10, gender, subCategory } = opts;
  const origin = pincode ? pinCodeIndex[pincode] : undefined;

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
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
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
    basePrice: input.basePrice ?? 0,
    compareAtPrice: input.compareAtPrice,
    images: input.images?.length ? input.images : [{ url: placeholderImage(input.title ?? "New product", "#334155", "#f1f5f9") }],
    sizes: input.sizes?.length ? input.sizes : ["Free Size"],
    stockRemaining: input.stockRemaining ?? 10,
    createdAt: new Date().toISOString(),
  };
  products.unshift(product);
  return product;
}

export function updateProduct(id: string, patch: Partial<Product>): Product | null {
  const product = products.find((p) => p.id === id);
  if (!product) return null;
  Object.assign(product, patch);
  return product;
}

export function deleteProduct(id: string): boolean {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  products.splice(idx, 1);
  return true;
}

export function getStoreProducts(storeId: string): Product[] {
  return products.filter((p) => p.storeId === storeId);
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
  return theme;
}

// ---------------------------------------------------------------------
// Orders - created at checkout, stands in for the (not-yet-modeled) orders
// table. In-memory only; a shopper's own order ids are kept client-side in
// localStorage (lib/orders.ts) since there's no auth to scope a query by.
// ---------------------------------------------------------------------
export interface OrderItem {
  productId: string;
  title: string;
  storeName: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: "placed" | "confirmed";
  shippingAddress?: ShippingAddress;
  createdAt: string;
}

export const orders: Order[] = globalThis.__sioOrders ?? (globalThis.__sioOrders = []);

export function createOrder(items: OrderItem[], shippingAddress?: ShippingAddress): Order {
  const order: Order = {
    id: `SIO-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    items,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    status: "confirmed",
    shippingAddress,
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  return order;
}

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
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
export const subscriptions: Record<string, Subscription> = globalThis.__sioSubscriptions ?? (globalThis.__sioSubscriptions = INITIAL_SUBSCRIPTIONS);

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function getSubscription(storeId: string): Subscription {
  return subscriptions[storeId] ?? { storeId, planCode: "lite", status: "active", currentPeriodEnd: futureDate(30) };
}

export function changePlan(storeId: string, planCode: Plan["code"]): Subscription {
  const sub = getSubscription(storeId);
  sub.planCode = planCode;
  sub.status = "active";
  subscriptions[storeId] = sub;
  return sub;
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

export const analyticsEvents: AnalyticsEvent[] = globalThis.__sioAnalyticsEvents ?? (globalThis.__sioAnalyticsEvents = []);

export function trackPageView(storeId: string, qrPosition?: string) {
  const now = new Date().toISOString();
  analyticsEvents.push({ storeId, eventType: "page_view", occurredAt: now });
  if (qrPosition) analyticsEvents.push({ storeId, eventType: "qr_scan", qrPosition, occurredAt: now });
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

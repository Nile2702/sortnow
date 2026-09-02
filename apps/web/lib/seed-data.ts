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

export const stores: Store[] = [
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

export const themes: Record<string, any> = {
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
      sectionOrder: ["hero", "liveSaleStrip", "categoryNav", "featuredCollection", "newArrivals"],
      heroCarousel: [
        {
          imageUrl: placeholderImage("Urban Vogue — Festive Collection", "#7c2d12", "#f5deb3", 1200, 480),
          altText: "Festive ethnic collection",
          ctaLabel: "Shop Festive Wear",
          ctaLink: "/store/urban-vogue",
        },
      ],
      featuredCollection: { title: "This Week's Picks", maxItems: 8 },
    },
    liveSale: { enabled: true, countdownStyle: "digital", badgeText: "FLAT 40% OFF — TODAY ONLY" },
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
          imageUrl: placeholderImage("South Silk House — Kanjivaram", "#7a1f3d", "#ffe9d6", 1200, 480),
          altText: "Kanjivaram silk sarees",
          ctaLabel: "Explore Silk Sarees",
          ctaLink: "/store/south-silk-house",
        },
      ],
      featuredCollection: { title: "Signature Kanjivaram", maxItems: 8 },
    },
    liveSale: { enabled: false },
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
      sectionOrder: ["hero", "liveSaleStrip", "featuredCollection", "categoryNav", "newArrivals"],
      heroCarousel: [
        {
          imageUrl: placeholderImage("Denim District — New Arrivals", "#1e3a8a", "#e5e7eb", 1200, 480),
          altText: "New denim arrivals",
          ctaLabel: "Shop New Denim",
          ctaLink: "/store/denim-district",
        },
      ],
      featuredCollection: { title: "Fresh Fits", maxItems: 8 },
    },
    liveSale: { enabled: true, countdownStyle: "text", badgeText: "WEEKEND SALE — 25% OFF DENIM" },
  },
};

export const categories: Record<string, { id: string; name: string }[]> = {
  "store-urban-vogue": [
    { id: "cat-sarees", name: "Sarees" },
    { id: "cat-kurtis", name: "Kurtis" },
    { id: "cat-lehengas", name: "Lehengas" },
  ],
  "store-south-silk-house": [
    { id: "cat-silk-sarees", name: "Silk Sarees" },
    { id: "cat-cotton-sarees", name: "Cotton Sarees" },
  ],
  "store-denim-district": [
    { id: "cat-jeans", name: "Jeans" },
    { id: "cat-jackets", name: "Jackets" },
    { id: "cat-tshirts", name: "T-Shirts" },
  ],
};

export interface Product {
  id: string;
  storeId: string;
  storeSlug: string;
  categoryId: string;
  title: string;
  basePrice: number;
  compareAtPrice?: number;
  images: { url: string }[];
  stockRemaining?: number;
  createdAt: string;
}

export const products: Product[] = [
  {
    id: "p-uv-1",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-sarees",
    title: "Banarasi Silk Saree — Maroon",
    basePrice: 2499,
    compareAtPrice: 3999,
    images: [{ url: placeholderImage("Banarasi Silk Saree", "#7c2d12", "#f5deb3") }],
    stockRemaining: 3,
    createdAt: "2026-08-30",
  },
  {
    id: "p-uv-2",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-kurtis",
    title: "Cotton Anarkali Kurti — Mustard",
    basePrice: 899,
    images: [{ url: placeholderImage("Anarkali Kurti", "#d97706", "#fffaf0") }],
    stockRemaining: 12,
    createdAt: "2026-08-28",
  },
  {
    id: "p-uv-3",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-lehengas",
    title: "Bridal Lehenga — Wine Red",
    basePrice: 8999,
    compareAtPrice: 12999,
    images: [{ url: placeholderImage("Bridal Lehenga", "#9f1239", "#fce7f3") }],
    stockRemaining: 2,
    createdAt: "2026-08-20",
  },
  {
    id: "p-uv-4",
    storeId: "store-urban-vogue",
    storeSlug: "urban-vogue",
    categoryId: "cat-kurtis",
    title: "Chikankari Straight Kurti — White",
    basePrice: 1299,
    images: [{ url: placeholderImage("Chikankari Kurti", "#f5deb3", "#7c2d12") }],
    stockRemaining: 8,
    createdAt: "2026-09-01",
  },
  {
    id: "p-ssh-1",
    storeId: "store-south-silk-house",
    storeSlug: "south-silk-house",
    categoryId: "cat-silk-sarees",
    title: "Kanjivaram Silk Saree — Emerald & Gold",
    basePrice: 5999,
    compareAtPrice: 7999,
    images: [{ url: placeholderImage("Kanjivaram Silk Saree", "#7a1f3d", "#ffe9d6") }],
    stockRemaining: 4,
    createdAt: "2026-08-25",
  },
  {
    id: "p-ssh-2",
    storeId: "store-south-silk-house",
    storeSlug: "south-silk-house",
    categoryId: "cat-cotton-sarees",
    title: "Handloom Cotton Saree — Indigo",
    basePrice: 1499,
    images: [{ url: placeholderImage("Handloom Cotton Saree", "#c98a2c", "#fffdf8") }],
    stockRemaining: 15,
    createdAt: "2026-08-29",
  },
  {
    id: "p-dd-1",
    storeId: "store-denim-district",
    storeSlug: "denim-district",
    categoryId: "cat-jeans",
    title: "Slim Fit Stretch Jeans — Indigo",
    basePrice: 1799,
    compareAtPrice: 2399,
    images: [{ url: placeholderImage("Slim Fit Jeans", "#1e3a8a", "#e5e7eb") }],
    stockRemaining: 20,
    createdAt: "2026-08-27",
  },
  {
    id: "p-dd-2",
    storeId: "store-denim-district",
    storeSlug: "denim-district",
    categoryId: "cat-jackets",
    title: "Oversized Denim Jacket",
    basePrice: 2299,
    images: [{ url: placeholderImage("Denim Jacket", "#2563eb", "#f8fafc") }],
    stockRemaining: 6,
    createdAt: "2026-09-01",
  },
];

export const liveSales: Record<string, { title: string; endsAt: string }> = {
  "store-urban-vogue": {
    title: "FLAT 40% OFF — TODAY ONLY",
    endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
  "store-denim-district": {
    title: "WEEKEND SALE — 25% OFF DENIM",
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

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

export function discoverStores(opts: { pincode?: string; radiusKm?: number; category?: string }) {
  const { pincode, radiusKm = 10, category } = opts;
  const origin = pincode ? pinCodeIndex[pincode] : undefined;

  return stores
    .filter((s) => s.status === "active")
    .filter((s) => !category || category === "all" || s.category === category)
    .map((s) => ({
      ...s,
      distanceKm: origin ? Math.round(haversineKm(origin.lat, origin.lng, s.latitude, s.longitude) * 10) / 10 : null,
      hasLiveSale: Boolean(liveSales[s.id]),
    }))
    .filter((s) => !origin || s.distanceKm === null || s.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

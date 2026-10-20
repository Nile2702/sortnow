// Postgres-backed data layer for every /api/v1/* route. This used to be an
// in-memory array/object store (mirrored to .data/db.json via
// lib/persist.ts) standing in for the Tenant/Catalog/Search microservices -
// see database/schema-live.sql for the real schema this module now talks
// to via lib/db.ts's pooled `pg` connection, and git history for the prior
// in-memory version this file replaced.
//
// Every exported function below keeps its original name, parameter shape,
// and return shape from the in-memory version - the only change callers
// need to make is `await`ing what's now a real database round trip, plus
// swapping a handful of direct `stores`/`products`/`themes`/`categories`
// array imports for the `getAllStores()`/`getAllProducts()`/
// `getAllThemes()`/`getAllCategories()` functions below (see call sites
// under app/api/**, components/CategoryNav.tsx, components/ProductGrid.tsx,
// lib/theme.ts, app/sitemap.ts and app/product/[productId]/layout.tsx).
import { query, queryOne, execute, withTransaction } from "./db";
import { Gender, ALL_SIZES, CATEGORY_TREE } from "./catalog-constants";
import { hashPassword, verifyPassword } from "./auth/password";
import { validatePassword } from "./validate-password";
import { lookupPincode } from "india-post-pincode";
import { haversineKm } from "./geo";
import { isPastReservationWindow } from "./reservation-expiry";
import { fuzzyBestScore } from "./fuzzy-search";
import { sendNotificationEmail } from "./email";

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
  status: "draft" | "pending_review" | "active" | "suspended" | "closed";
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
  // Optional - the delivery address for seller OTP login (see lib/email.ts
  // and /api/v1/seller/auth/otp/request). Not collected at signup; the OTP
  // login UI asks for it the first time a store with a phone on file but no
  // email tries to request an OTP, then persists it via updateStoreEmail()
  // so it's never asked again.
  email?: string;
  // Paid featured placement (see BOOST_PACKAGES) - ranks this store first in
  // "Stores near you" and /shops while active, same "flip a flag, no real
  // payment processor" convention as changePlan()/photo credits.
  boostedUntil?: string | null;
  // Submitted (not verified - see the Account page) during KYC onboarding,
  // and editable afterward from the same page (updateStoreAccountDetails) if
  // something changes. gstin/pan/upiVpa are first populated once the seller
  // reaches submitStoreForReview() below, which moves status to
  // "pending_review" pending the site owner's manual review via
  // /admin/sellers. legalBusinessName/businessType are collected in the same
  // onboarding step but aren't part of that review gate.
  legalBusinessName?: string | null;
  businessType?: string | null;
  gstin?: string | null;
  pan?: string | null;
  upiVpa?: string | null;
  submittedForReviewAt?: string | null;
  createdAt?: string;
  // Set whenever a store transitions to "active" (first approval via
  // activateStore(), or a later reinstateStore() after a suspension) - see
  // app/admin/sellers/active/page.tsx, which shows this as "Activated" for
  // the site owner's active-sellers list. Undefined for a store that has
  // never been active (draft/pending_review/rejected).
  activatedAt?: string | null;
}

function rowToStore(r: any): Store {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    category: r.category,
    city: r.city,
    pincode: r.pincode,
    localMarket: r.local_market,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    // Always overwritten by getAllStores() right after this map, from
    // whichever sale campaign (if any) is currently active for this store -
    // there's no stores.live_sale column anymore to read a value from here.
    liveSale: null,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    boostedUntil: r.boosted_until ? new Date(r.boosted_until).toISOString() : null,
    legalBusinessName: r.legal_business_name ?? null,
    businessType: r.business_type ?? null,
    gstin: r.gstin ?? null,
    pan: r.pan ?? null,
    upiVpa: r.upi_vpa ?? null,
    submittedForReviewAt: r.submitted_for_review_at ? new Date(r.submitted_for_review_at).toISOString() : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    activatedAt: r.activated_at ? new Date(r.activated_at).toISOString() : null,
  };
}

// Every store, newest first (new signups via createStore() used to
// `unshift` onto the front of the in-memory array - ordering by created_at
// descending reproduces that). Replaces the old bare `export const stores`
// array - see call sites for the one-line `const stores = await
// getAllStores();` this requires at the top of whichever handler used it.
export async function getAllStores(): Promise<Store[]> {
  const rows = await query<any>(`SELECT * FROM stores ORDER BY created_at DESC`);
  const stores = rows.map(rowToStore);
  // liveSale is derived here from any currently-active sale campaign,
  // overriding whatever's in the stores.live_sale column (unused, kept only
  // for schema history) - see the comment on getActiveSaleCampaignsByStore
  // and SaleCampaign below for why a real, scoped Promotions campaign is
  // the only thing that can ever put a Live Sale badge on a store now.
  const byStore = await getActiveSaleCampaignsByStore(stores.map((s) => s.id));
  for (const store of stores) {
    const campaigns = byStore.get(store.id);
    if (!campaigns || campaigns.length === 0) {
      store.liveSale = null;
      continue;
    }
    // Most recently started wins if a seller somehow has more than one
    // campaign active at once - rare, but needs a deterministic pick.
    const campaign = [...campaigns].sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1))[0];
    store.liveSale = {
      headline: campaign.name,
      discountLabel: formatSaleCampaignLabel(campaign),
      startedAt: campaign.startsAt,
      endsAt: campaign.endsAt,
    };
  }
  return stores;
}

async function slugExists(slug: string): Promise<boolean> {
  const row = await queryOne<any>(`SELECT 1 FROM stores WHERE slug = $1`, [slug]);
  return !!row;
}

export async function verifySellerLogin(storeSlug: string, password: string): Promise<Store | null> {
  const row = await queryOne<any>(`SELECT * FROM stores WHERE slug = $1`, [storeSlug]);
  if (!row) return null;
  if (!verifyPassword(password, row.seller_password_hash)) return null;
  return rowToStore(row);
}

// OTP login only ever proves the caller owns this phone number - it must
// already be registered against exactly one store (set at signup or later
// via account settings), unlike shopper OTP login which has no
// pre-registration requirement at all.
export async function findStoreByPhone(phone: string): Promise<Store | null> {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  const rows = await query<any>(`SELECT * FROM stores WHERE phone IS NOT NULL`);
  const match = rows.find((r) => r.phone.replace(/\D/g, "").slice(-10) === normalized);
  return match ? rowToStore(match) : null;
}

// Persists a store's email once collected - the OTP login flow is currently
// the only place a seller provides one (there's no settings page for it
// yet), the first time they request an OTP for a store that has a phone on
// file but no email. Never called to clear an existing email, only to fill
// one in for the first time.
export async function updateStoreEmail(storeId: string, email: string): Promise<void> {
  await execute(`UPDATE stores SET email = $2 WHERE id = $1`, [storeId, email]);
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
// the seller submits their onboarding/KYC details (-> "pending_review") and
// the site owner manually approves it (-> "active" via activateStore),
// matching how a real marketplace wouldn't list an unverified merchant
// either.
export async function createStore(input: CreateStoreInput): Promise<{ store: Store } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Store name is required." };
  if (name.length > 120) return { error: "Store name is too long." };
  if (!input.localMarket.trim()) return { error: "Local market or area is required." };
  const passwordCheck = validatePassword(input.password);
  if (passwordCheck.errors.length > 0) return { error: passwordCheck.errors[0] };

  const geo = resolvePincode(input.pincode);
  if (!geo) return { error: "Couldn't recognize that PIN code." };

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (await slugExists(slug)) {
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

  await query(
    `INSERT INTO stores (id, slug, name, status, category, city, pincode, local_market, latitude, longitude, phone, seller_password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      store.id, store.slug, store.name, store.status, store.category, store.city, store.pincode,
      store.localMarket, store.latitude, store.longitude, store.phone ?? null, hashPassword(input.password),
    ]
  );

  // A brand-new store still needs a theme record to render its storefront
  // page and Theme Studio at all - every seed store has one, so this one
  // gets a sensible neutral default (the app's own teal/ink brand colors)
  // rather than leaving the theme undefined.
  const theme = {
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
  await query(`INSERT INTO themes (store_id, theme) VALUES ($1, $2)`, [store.id, JSON.stringify(theme)]);

  return { store };
}

// Theme Studio config per store. Replaces the old bare `export const
// themes` object - see call sites for the `const themes = await
// getAllThemes();` this requires.
export async function getAllThemes(): Promise<Record<string, any>> {
  const rows = await query<any>(`SELECT store_id, theme FROM themes`);
  const map: Record<string, any> = {};
  for (const r of rows) map[r.store_id] = r.theme;
  return map;
}

// Per-store category list. Replaces the old bare `export const categories`
// object - see call sites for the `const categories = await
// getAllCategories();` this requires.
export async function getAllCategories(): Promise<Record<string, { id: string; name: string }[]>> {
  const rows = await query<any>(`SELECT * FROM categories ORDER BY store_id, sort_order`);
  const map: Record<string, { id: string; name: string }[]> = {};
  for (const r of rows) {
    (map[r.store_id] ??= []).push({ id: r.id, name: r.name });
  }
  return map;
}

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
  // Optional, seller-assigned - lets a multi-brand/reseller store tag which
  // label an item is. Free text, but the product form offers a quick-pick
  // list of this store's own previously-used brand names (see
  // GET .../products:brand suggestions on the client) instead of retyping
  // the same label on every product.
  brand?: string;
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
  // Optional - what the seller paid to source/make this item. Never shown
  // to shoppers (it has no storefront UI), only used to compute profit in
  // the seller's own reports. A seller who skips it just doesn't get a
  // profit figure for that product's sales, rather than the form forcing
  // them to guess a number.
  costPrice?: number;
  images: { url: string }[];
  sizes: string[];
  stockRemaining?: number;
  createdAt: string;
  // "on_hold" is set by the site owner's content moderation tool
  // (app/admin/products, app/api/v1/admin/products/[productId]/hold) when a
  // single listing needs to come down without suspending the whole seller's
  // store (see suspendStore for the store-level equivalent). Excluded from
  // every shopper-facing search/browse/reservation path the same way a
  // non-"active" store is (see the status filters throughout this file),
  // but still returned to the seller's own dashboard (getStoreProducts)
  // with the status surfaced so they know it's hidden and why, rather than
  // it silently vanishing from their own product list.
  status: "live" | "on_hold";
}

function rowToProduct(r: any): Product {
  return {
    id: r.id,
    storeId: r.store_id,
    storeSlug: r.store_slug,
    categoryId: r.category_id,
    gender: r.gender,
    subCategory: r.sub_category,
    title: r.title,
    description: r.description ?? undefined,
    fabric: r.fabric ?? undefined,
    color: r.color ?? undefined,
    brand: r.brand ?? undefined,
    colorGroupId: r.color_group_id ?? undefined,
    productCode: r.product_code ?? undefined,
    basePrice: Number(r.base_price),
    compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : undefined,
    costPrice: r.cost_price != null ? Number(r.cost_price) : undefined,
    images: r.images ?? [],
    sizes: r.sizes ?? [],
    stockRemaining: r.stock_remaining ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
    status: r.status ?? "live",
  };
}

// Every product, newest first (same unshift-order reasoning as
// getAllStores()). Replaces the old bare `export const products` array.
export async function getAllProducts(): Promise<Product[]> {
  const rows = await query<any>(`SELECT * FROM products ORDER BY created_at DESC`);
  return rows.map(rowToProduct);
}

export { haversineKm };

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
export async function searchProducts(opts: {
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
  // See discoverStores() below for why raw coordinates take priority.
  const origin = lat != null && lng != null ? { lat, lng } : pincode ? resolvePincode(pincode) : undefined;
  const searchQuery = q?.trim().toLowerCase();

  const stores = await getAllStores();
  const products = await getAllProducts();
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
      const searchScore = searchQuery
        ? fuzzyBestScore(searchQuery, [p.title, p.fabric, p.subCategory, p.color, p.gender])
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
    .filter((p) => p.status !== "on_hold")
    .filter((p) => !origin || p.distanceKm === null || p.distanceKm <= radiusKm)
    .filter((p) => !gender || gender === "all" || p.gender === gender)
    .filter((p) => !subCategory || p.subCategory === subCategory)
    .filter((p) => minPrice == null || p.basePrice >= minPrice)
    .filter((p) => maxPrice == null || p.basePrice <= maxPrice)
    .filter((p) => !size || p.sizes.includes(size))
    .filter((p) => !searchQuery || p.searchScore > 0);

  if (sort === "price_asc") results = [...results].sort((a, b) => a.basePrice - b.basePrice);
  else if (sort === "price_desc") results = [...results].sort((a, b) => b.basePrice - a.basePrice);
  else if (sort === "newest") results = [...results].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  else if (searchQuery) results = [...results].sort((a, b) => b.searchScore - a.searchScore || (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  else results = [...results].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

  // costPrice (seller's own purchase cost) must never reach this
  // shopper-facing search result, same reasoning as searchScore itself.
  return results.map(({ searchScore, costPrice: _costPrice, ...p }) => p);
}

// Featured category tiles for the homepage "Browse by Category" strip.
// Counts are computed live from the catalog rather than hardcoded.
export const CATEGORY_TILES: { label: string; gender: Gender; subCategory: string }[] = [
  { label: "Sarees", gender: "women", subCategory: "Sarees" },
  { label: "Kurtis", gender: "women", subCategory: "Kurtis" },
  { label: "Jeans", gender: "men", subCategory: "Jeans" },
  { label: "Kids Wear", gender: "kids", subCategory: "" },
];

export async function getCategoryTileCounts() {
  const [products, stores] = await Promise.all([getAllProducts(), getAllStores()]);
  const storesById = new Map(stores.map((s) => [s.id, s]));
  // Same visibility rules as searchProducts/discoverStores/getAllShops - a
  // homepage category count shouldn't advertise stock that isn't actually
  // browsable (a suspended store's or an on-hold listing's products).
  const visible = products.filter((p) => storesById.get(p.storeId)?.status === "active" && p.status !== "on_hold");
  return CATEGORY_TILES.map((tile) => {
    const matches = visible.filter((p) => p.gender === tile.gender && (!tile.subCategory || p.subCategory === tile.subCategory));
    // A real product photo for the tile's own card background - picked from
    // whatever's actually live right now rather than a fixed asset, so a
    // newly-listed product can become the tile's photo and one that's sold
    // out/held never lingers as the face of a category with nothing left
    // to show for it.
    return { ...tile, count: matches.length, imageUrl: matches[0]?.images[0]?.url };
  });
}

export async function discoverStores(opts: { pincode?: string; lat?: number; lng?: number; radiusKm?: number; gender?: string; subCategory?: string }) {
  const { pincode, lat, lng, radiusKm = 10, gender, subCategory } = opts;
  // Real GPS coordinates (from the browser's Geolocation API) take priority
  // over a typed PIN code when both are somehow present - there's no
  // reverse-geocoding service in this demo to turn coordinates into a PIN
  // code, so distance is computed directly from them instead, the same way
  // haversineKm already works from a resolved PIN code's lat/lng.
  const origin = lat != null && lng != null ? { lat, lng } : pincode ? resolvePincode(pincode) : undefined;

  const stores = await getAllStores();
  const products = await getAllProducts();

  const matchingStoreIds =
    gender && gender !== "all"
      ? new Set(
          products
            .filter((p) => p.status !== "on_hold")
            .filter((p) => p.gender === gender)
            .filter((p) => !subCategory || p.subCategory === subCategory)
            .map((p) => p.storeId)
        )
      : null;

  const candidates = stores
    .filter((s) => s.status === "active")
    .filter((s) => !matchingStoreIds || matchingStoreIds.has(s.id))
    .map((s) => ({
      ...s,
      distanceKm: origin ? Math.round(haversineKm(origin.lat, origin.lng, s.latitude, s.longitude) * 10) / 10 : null,
    }));

  const withRating = await Promise.all(
    candidates.map(async (s) => ({ ...s, rating: await getStoreRatingSummary(s.id) }))
  );

  return withRating
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
export async function getAllShops() {
  const stores = await getAllStores();
  const products = await getAllProducts();
  const active = stores.filter((s) => s.status === "active");
  const withExtras = await Promise.all(
    active.map(async (s) => ({
      ...s,
      productCount: products.filter((p) => p.storeId === s.id && p.status !== "on_hold").length,
      rating: await getStoreRatingSummary(s.id),
    }))
  );
  return withExtras.sort((a, b) => Number(isBoostActive(b.boostedUntil)) - Number(isBoostActive(a.boostedUntil)));
}

// ---------------------------------------------------------------------
// Seller Portal: catalog + theme mutations.
// ---------------------------------------------------------------------
export async function createProduct(storeId: string, input: Partial<Product>): Promise<Product> {
  const storeRow = await queryOne<any>(`SELECT slug FROM stores WHERE id = $1`, [storeId]);
  const product: Product = {
    id: `p-custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storeId,
    storeSlug: storeRow?.slug ?? "",
    categoryId: input.categoryId ?? "cat-custom",
    gender: (input.gender as Gender) ?? "women",
    subCategory: input.subCategory ?? "Other",
    title: input.title ?? "Untitled product",
    description: input.description,
    fabric: input.fabric,
    color: input.color,
    brand: input.brand,
    colorGroupId: input.colorGroupId,
    productCode: input.productCode,
    basePrice: input.basePrice ?? 0,
    compareAtPrice: input.compareAtPrice,
    costPrice: input.costPrice,
    images: input.images?.length ? input.images : [{ url: placeholderImage(input.title ?? "New product", "#334155", "#f1f5f9") }],
    sizes: input.sizes?.length ? input.sizes : ["Free Size"],
    stockRemaining: input.stockRemaining ?? 10,
    createdAt: new Date().toISOString(),
    // Every new listing starts "live" - only the admin hold/unhold tool
    // (see holdProduct/unholdProduct below) ever sets "on_hold".
    status: "live",
  };
  await query(
    `INSERT INTO products (id, store_id, store_slug, category_id, gender, sub_category, title, description, fabric, color, brand, color_group_id, product_code, base_price, compare_at_price, cost_price, images, sizes, stock_remaining, created_at, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      product.id, product.storeId, product.storeSlug, product.categoryId, product.gender, product.subCategory,
      product.title, product.description ?? null, product.fabric ?? null, product.color ?? null, product.brand ?? null,
      product.colorGroupId ?? null, product.productCode ?? null, product.basePrice, product.compareAtPrice ?? null,
      product.costPrice ?? null, JSON.stringify(product.images), product.sizes, product.stockRemaining ?? null, product.createdAt,
      product.status,
    ]
  );
  return product;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
  const existingRow = await queryOne<any>(`SELECT * FROM products WHERE id = $1`, [id]);
  if (!existingRow) return null;
  const existing = rowToProduct(existingRow);
  const previousStock = existing.stockRemaining;
  const merged: Product = { ...existing, ...patch };
  await query(
    `UPDATE products SET category_id=$2, gender=$3, sub_category=$4, title=$5, description=$6, fabric=$7, color=$8, brand=$9,
       color_group_id=$10, product_code=$11, base_price=$12, compare_at_price=$13, cost_price=$14, images=$15, sizes=$16, stock_remaining=$17
     WHERE id = $1`,
    [
      id, merged.categoryId, merged.gender, merged.subCategory, merged.title, merged.description ?? null,
      merged.fabric ?? null, merged.color ?? null, merged.brand ?? null, merged.colorGroupId ?? null,
      merged.productCode ?? null, merged.basePrice, merged.compareAtPrice ?? null, merged.costPrice ?? null,
      JSON.stringify(merged.images), merged.sizes, merged.stockRemaining ?? null,
    ]
  );
  if ("stockRemaining" in patch) await notifyWaitlistIfRestocked(merged, previousStock);
  return merged;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const affected = await execute(`DELETE FROM products WHERE id = $1`, [id]);
  return affected > 0;
}

export async function getStoreProducts(storeId: string): Promise<Product[]> {
  const rows = await query<any>(`SELECT * FROM products WHERE store_id = $1 ORDER BY created_at DESC`, [storeId]);
  return rows.map(rowToProduct);
}

// Live/on-hold split for one store (app/admin/sellers/[storeId] - the site
// owner's consolidated seller detail view), without pulling every product
// row (and its images/sizes JSON) back just to count them like
// getStoreProducts(storeId).length would. `status` is a NOT NULL enum (see
// database/schema-live.sql), so every row lands in exactly one bucket.
export async function getProductCountsForStore(storeId: string): Promise<{ total: number; live: number; onHold: number }> {
  const rows = await query<any>(`SELECT status, COUNT(*)::int AS count FROM products WHERE store_id = $1 GROUP BY status`, [storeId]);
  let live = 0;
  let onHold = 0;
  for (const r of rows) {
    if (r.status === "on_hold") onHold = r.count;
    else if (r.status === "live") live = r.count;
  }
  return { total: live + onHold, live, onHold };
}

// The other colorways of the same listing (e.g. the "select colors" step
// creating one product per color) - same colorGroupId, same store, not
// itself - so the product page can offer them as swatches.
export async function getColorSiblings(product: Product): Promise<Product[]> {
  if (!product.colorGroupId) return [];
  const rows = await query<any>(
    `SELECT * FROM products WHERE id != $1 AND store_id = $2 AND color_group_id = $3`,
    [product.id, product.storeId, product.colorGroupId]
  );
  return rows.map(rowToProduct);
}

// Flips a store to "active", making it visible to shoppers (draft/
// pending_review stores are excluded from every shopper-facing search/
// browse query - see the "active" filters above). This is now ONLY called
// from the site owner's manual review tool (app/admin/sellers,
// app/api/v1/admin/sellers/[storeId]/approve) - the seller's own
// onboarding flow can no longer activate its own store (see
// submitStoreForReview below), since the pilot deliberately has a human
// review each new seller instead of any automated KYC check.
export async function activateStore(storeId: string): Promise<Store | null> {
  const row = await queryOne<any>(`UPDATE stores SET status = 'active', activated_at = now() WHERE id = $1 RETURNING *`, [storeId]);
  if (!row) return null;
  const store = rowToStore(row);
  if (store.phone) {
    await notify(store.id, store.phone, "seller", "store_approved", `Your store is live on SORT NOW! Shoppers can now find ${store.name} and reserve items for pickup.`, store.email);
  }
  return store;
}

// Puts an already-active store on hold - e.g. a shopper complaint, a
// policy violation discovered after approval - without touching anything
// it already listed (see the "active"-only filters above: a suspended
// store's products stop appearing in search/browse/reservation the moment
// this runs, the same way a "draft"/"pending_review" store's never did).
// Only ever applied from "active", matching the narrow admin UI
// (app/admin/sellers/active) that only shows a "Put on hold" button next
// to a currently-active store.
export async function suspendStore(storeId: string): Promise<Store | null> {
  const row = await queryOne<any>(`UPDATE stores SET status = 'suspended' WHERE id = $1 AND status = 'active' RETURNING *`, [storeId]);
  if (!row) return null;
  const store = rowToStore(row);
  if (store.phone) {
    await notify(store.id, store.phone, "seller", "store_suspended", `Your store has been temporarily put on hold - contact support if you have questions.`, store.email);
  }
  return store;
}

// Reverses suspendStore - the site owner decided the hold was unwarranted
// or the issue's resolved. Refreshes activated_at (same reasoning as
// activateStore above: it's "when did this store last become visible to
// shoppers", not "when was it first approved"), same as reinstating a
// store is itself a fresh activation event.
export async function reinstateStore(storeId: string): Promise<Store | null> {
  const row = await queryOne<any>(`UPDATE stores SET status = 'active', activated_at = now() WHERE id = $1 AND status = 'suspended' RETURNING *`, [storeId]);
  if (!row) return null;
  const store = rowToStore(row);
  if (store.phone) {
    await notify(store.id, store.phone, "seller", "store_reinstated", `Good news - your store is back live on SORT NOW. Shoppers can reserve items again.`, store.email);
  }
  return store;
}

// Sets a "pending_review" store back to "draft" - the site owner declined
// to activate it (e.g. the submitted GSTIN/PAN look wrong). The seller can
// resubmit via onboarding, which re-runs submitStoreForReview below.
export async function rejectStore(storeId: string): Promise<Store | null> {
  const row = await queryOne<any>(`UPDATE stores SET status = 'draft' WHERE id = $1 RETURNING *`, [storeId]);
  if (!row) return null;
  const store = rowToStore(row);
  if (store.phone) {
    await notify(store.id, store.phone, "seller", "store_rejected", `Your store submission needs another look before it can go live - double-check your details in onboarding and resubmit, or contact support if you have questions.`, store.email);
  }
  return store;
}

export interface SubmitStoreForReviewInput {
  legalBusinessName?: string;
  businessType?: string;
  gstin?: string;
  pan?: string;
  upiVpa?: string;
}

// Called once by the onboarding wizard's final step (app/seller/(dashboard)/
// account/page.tsx, shown only while status is still "draft" - see
// updateStoreAccountDetails below for editing any of this afterward). No
// real KYC provider is ever called - this just records whatever the seller
// typed in and moves the store from "draft" to "pending_review" so it shows
// up on the site owner's manual review queue (getStoresPendingReview below).
// Only draft stores move - resubmitting while already pending_review/active
// is a no-op so a seller can't use this to undo an admin's decision.
export async function submitStoreForReview(storeId: string, input: SubmitStoreForReviewInput): Promise<Store | null> {
  const row = await queryOne<any>(
    `UPDATE stores
     SET status = 'pending_review', legal_business_name = $2, business_type = $3, gstin = $4, pan = $5, upi_vpa = $6, submitted_for_review_at = now()
     WHERE id = $1 AND status = 'draft'
     RETURNING *`,
    [
      storeId,
      input.legalBusinessName?.trim() || null,
      input.businessType?.trim() || null,
      input.gstin?.trim() || null,
      input.pan?.trim() || null,
      input.upiVpa?.trim() || null,
    ]
  );
  return row ? rowToStore(row) : null;
}

export interface UpdateStoreAccountInput {
  legalBusinessName?: string;
  businessType?: string;
  gstin?: string;
  pan?: string;
  upiVpa?: string;
  phone?: string;
  email?: string;
}

// The Account page's "edit my details afterward" path - unlike
// submitStoreForReview above, this works from any status (a seller fixing a
// typo'd GSTIN while already active shouldn't need the site owner's help),
// and only touches fields actually present in `patch` so a partial save
// never blanks out the rest. Validation (format checks, required-ness)
// happens in the API route, same division of labor as updateBillingSettings.
export async function updateStoreAccountDetails(storeId: string, patch: UpdateStoreAccountInput): Promise<Store | null> {
  const sets: string[] = [];
  const values: unknown[] = [storeId];
  function set(column: string, value: unknown) {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }
  if (patch.legalBusinessName !== undefined) set("legal_business_name", patch.legalBusinessName.trim() || null);
  if (patch.businessType !== undefined) set("business_type", patch.businessType.trim() || null);
  if (patch.gstin !== undefined) set("gstin", patch.gstin.trim() || null);
  if (patch.pan !== undefined) set("pan", patch.pan.trim() || null);
  if (patch.upiVpa !== undefined) set("upi_vpa", patch.upiVpa.trim() || null);
  if (patch.phone !== undefined) set("phone", patch.phone.trim() || null);
  if (patch.email !== undefined) set("email", patch.email.trim() || null);
  if (sets.length === 0) {
    const row = await queryOne<any>(`SELECT * FROM stores WHERE id = $1`, [storeId]);
    return row ? rowToStore(row) : null;
  }
  const row = await queryOne<any>(`UPDATE stores SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, values);
  return row ? rowToStore(row) : null;
}

// The site owner's review queue (app/admin/sellers) - every store waiting
// on a manual approve/reject decision, oldest submission first so nobody
// waits behind a store that was just submitted.
export async function getStoresPendingReview(): Promise<Store[]> {
  const rows = await query<any>(`SELECT * FROM stores WHERE status = 'pending_review' ORDER BY submitted_for_review_at ASC NULLS LAST`);
  return rows.map(rowToStore);
}

// The site owner's active-sellers list (app/admin/sellers/active) - every
// store currently visible to shoppers, newest-activated first, alongside
// getSuspendedStores below for the "Reinstate" half of the same page.
export async function getActiveStores(): Promise<Store[]> {
  const rows = await query<any>(`SELECT * FROM stores WHERE status = 'active' ORDER BY activated_at DESC NULLS LAST, created_at DESC`);
  return rows.map(rowToStore);
}

export async function getSuspendedStores(): Promise<Store[]> {
  const rows = await query<any>(`SELECT * FROM stores WHERE status = 'suspended' ORDER BY created_at DESC`);
  return rows.map(rowToStore);
}

// Self-service "quit SORT NOW" for a seller (app/seller/(dashboard)/billing's
// Danger Zone) - unlike suspendStore, this is something the seller does to
// themselves, not something imposed on them, so there's no notify() call
// (they already know - they just clicked it). Only ever applied from
// "active", same reasoning as suspendStore: a draft/pending_review store
// was never visible to shoppers in the first place, so there's nothing for
// "closed" to mean there yet. Reuses the "closed" status already in
// store_status and the banner already in app/seller/(dashboard)/layout.tsx
// (it existed in the enum with nothing that could ever produce it until
// now). Reopening is admin-only (app/admin/sellers/active's "Closed
// stores" section, via the existing activateStore) - deliberately not
// self-service, so a seller can't accidentally close and instantly reopen
// without at least a support conversation in between.
export async function closeStore(storeId: string): Promise<Store | null> {
  const row = await queryOne<any>(`UPDATE stores SET status = 'closed' WHERE id = $1 AND status = 'active' RETURNING *`, [storeId]);
  return row ? rowToStore(row) : null;
}

export async function getClosedStores(): Promise<Store[]> {
  const rows = await query<any>(`SELECT * FROM stores WHERE status = 'closed' ORDER BY created_at DESC`);
  return rows.map(rowToStore);
}

// Reopens a store the seller previously closed themselves - admin-only
// (app/admin/sellers/active's "Closed stores" section), unlike suspend/
// reinstate which is a pair the seller has no button for at all. Guarded to
// only ever apply from "closed" (unlike activateStore, which has no status
// guard since its only caller already filters to pending_review stores) so
// this can't be pointed at a draft/suspended store by mistake.
export async function reactivateClosedStore(storeId: string): Promise<Store | null> {
  const row = await queryOne<any>(`UPDATE stores SET status = 'active', activated_at = now() WHERE id = $1 AND status = 'closed' RETURNING *`, [storeId]);
  if (!row) return null;
  const store = rowToStore(row);
  if (store.phone) {
    await notify(store.id, store.phone, "seller", "store_reinstated", `Welcome back - your store is live on SORT NOW again. Shoppers can reserve items from it once more.`, store.email);
  }
  return store;
}

// ---------------------------------------------------------------------
// Admin content moderation: individual product hold/unhold (app/admin/
// products, app/api/v1/admin/products/[productId]/hold|unhold) - the
// narrower alternative to suspendStore above when only one listing is a
// problem, not the whole seller.
// ---------------------------------------------------------------------
// Looks up the owning store's own phone/email for a product-moderation
// notify() call - holdProduct/unholdProduct only get a product row back
// from their own UPDATE, not the store's contact details.
async function notifyStoreAboutProduct(product: Product, trigger: "product_held" | "product_unheld", message: string): Promise<void> {
  const storeRow = await queryOne<any>(`SELECT phone, email FROM stores WHERE id = $1`, [product.storeId]);
  if (storeRow?.phone) {
    await notify(product.storeId, storeRow.phone, "seller", trigger, message, storeRow.email);
  }
}

export async function holdProduct(productId: string): Promise<Product | null> {
  const row = await queryOne<any>(`UPDATE products SET status = 'on_hold' WHERE id = $1 RETURNING *`, [productId]);
  if (!row) return null;
  const product = rowToProduct(row);
  await notifyStoreAboutProduct(
    product,
    "product_held",
    `Your listing "${product.title}" has been taken down and put on hold - it's no longer visible to shoppers. Contact support if you have questions.`
  );
  return product;
}

export async function unholdProduct(productId: string): Promise<Product | null> {
  const row = await queryOne<any>(`UPDATE products SET status = 'live' WHERE id = $1 RETURNING *`, [productId]);
  if (!row) return null;
  const product = rowToProduct(row);
  await notifyStoreAboutProduct(product, "product_unheld", `Your listing "${product.title}" is live again and visible to shoppers.`);
  return product;
}

export async function updateStoreTheme(storeId: string, patch: { primary?: string; accent?: string; heroTitle?: string; heroSubtitle?: string }) {
  const row = await queryOne<any>(`SELECT theme FROM themes WHERE store_id = $1`, [storeId]);
  if (!row) return null;
  const theme = row.theme;
  if (patch.primary) theme.brand.colors.primary = patch.primary;
  if (patch.accent) theme.brand.colors.accent = patch.accent;
  if (theme.layout.heroCarousel?.[0]) {
    if (patch.heroTitle) theme.layout.heroCarousel[0].title = patch.heroTitle;
    if (patch.heroSubtitle) theme.layout.heroCarousel[0].subtitle = patch.heroSubtitle;
  }
  await query(`UPDATE themes SET theme = $2 WHERE store_id = $1`, [storeId, JSON.stringify(theme)]);
  return theme;
}

// ---------------------------------------------------------------------
// Sale campaigns - a real, scoped discount a seller runs for a window of
// time (app/seller/(dashboard)/promotions). The LiveSale a store carries
// (see Store.liveSale, getAllStores above) used to be independently
// settable text a seller typed by hand - now it's entirely derived from
// whichever sale campaign is currently active, so the storefront/directory
// badge can never claim a discount that isn't actually running. See
// database/schema-live.sql's sale_campaigns comment for the full pricing
// reasoning: never written into products.base_price/compare_at_price, only
// applied at read time (see applyActiveSales below) so a product's stored
// price always matches what the seller actually typed.
// ---------------------------------------------------------------------
export interface SaleCampaign {
  id: string;
  storeId: string;
  name: string;
  discountType: "percent" | "flat";
  discountValue: number;
  scope: "all" | "category" | "products";
  gender?: Gender;
  subCategory?: string;
  productIds?: string[];
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

function rowToSaleCampaign(r: any): SaleCampaign {
  return {
    id: r.id,
    storeId: r.store_id,
    name: r.name,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    scope: r.scope,
    gender: r.gender ?? undefined,
    subCategory: r.sub_category ?? undefined,
    productIds: r.product_ids ?? undefined,
    startsAt: new Date(r.starts_at).toISOString(),
    endsAt: new Date(r.ends_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

// The Store.liveSale badge's discountLabel text, for whichever campaign
// getAllStores picked - "20% off storewide" / "20% off Kurtis" / "20% off
// on select items", so the badge's wording actually matches what it's
// describing instead of a seller's own free-text guess.
function formatSaleCampaignLabel(c: SaleCampaign): string {
  const amount = c.discountType === "percent" ? `${c.discountValue}% off` : `₹${c.discountValue} off`;
  if (c.scope === "all") return `${amount} storewide`;
  if (c.scope === "category") return `${amount} ${c.subCategory}`;
  return `${amount} on select items`;
}

export interface CreateSaleCampaignInput {
  name: string;
  discountType: "percent" | "flat";
  discountValue: number;
  scope: "all" | "category" | "products";
  gender?: Gender;
  subCategory?: string;
  productIds?: string[];
  startsAt?: string;
  endsAt: string;
}

export async function createSaleCampaign(storeId: string, input: CreateSaleCampaignInput): Promise<SaleCampaign> {
  const id = `sale-${storeId.slice(0, 24)}-${Date.now().toString(36)}`;
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const row = await queryOne<any>(
    `INSERT INTO sale_campaigns (id, store_id, name, discount_type, discount_value, scope, gender, sub_category, product_ids, starts_at, ends_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id, storeId, input.name, input.discountType, input.discountValue, input.scope,
      input.gender ?? null, input.subCategory ?? null, input.productIds ?? null,
      startsAt.toISOString(), new Date(input.endsAt).toISOString(),
    ]
  );
  return rowToSaleCampaign(row);
}

// Every campaign for this seller's own Promotions page - past, active, and
// upcoming - so they can see history, not just what's live right now.
export async function getSaleCampaignsForStore(storeId: string): Promise<SaleCampaign[]> {
  const rows = await query<any>(`SELECT * FROM sale_campaigns WHERE store_id = $1 ORDER BY starts_at DESC`, [storeId]);
  return rows.map(rowToSaleCampaign);
}

// Stops a campaign early. One not yet started is deleted outright (it never
// ran, nothing to keep a record of); one already running has its end time
// pulled to now instead, so it still shows up in the seller's own history
// as "ended early" rather than vanishing.
export async function cancelSaleCampaign(id: string, storeId: string): Promise<boolean> {
  const row = await queryOne<any>(`SELECT starts_at FROM sale_campaigns WHERE id = $1 AND store_id = $2`, [id, storeId]);
  if (!row) return false;
  if (new Date(row.starts_at).getTime() > Date.now()) {
    const affected = await execute(`DELETE FROM sale_campaigns WHERE id = $1 AND store_id = $2`, [id, storeId]);
    return affected > 0;
  }
  const affected = await execute(`UPDATE sale_campaigns SET ends_at = now() WHERE id = $1 AND store_id = $2`, [id, storeId]);
  return affected > 0;
}

// Applies whichever currently-active sale campaign matches each product,
// returning NEW objects with a discounted basePrice/compareAtPrice - the
// input array (and whatever query produced it) is never mutated, so this
// is only ever safe to call at an actual shopper-facing read boundary
// (search/detail/grid routes, components/ProductGrid.tsx), never inside
// getAllProducts/searchProducts/getStoreProducts/rowToProduct themselves -
// those are shared with the seller's own catalog-editing routes (see
// app/api/v1/seller/products/[productId]/route.ts), which must always see
// their real stored price, not a sale-discounted one.
// Shared by applyActiveSales (product-level discount) and getAllStores
// (store-level Live Sale badge, see rowToStore's caller below) - one query
// for whichever set of stores the caller cares about, grouped so each
// caller does its own store-id -> campaign[] lookup without a second round
// trip.
async function getActiveSaleCampaignsByStore(storeIds: string[]): Promise<Map<string, SaleCampaign[]>> {
  const byStore = new Map<string, SaleCampaign[]>();
  if (storeIds.length === 0) return byStore;
  const rows = await query<any>(
    `SELECT * FROM sale_campaigns WHERE store_id = ANY($1::text[]) AND starts_at <= now() AND ends_at > now()`,
    [storeIds]
  );
  for (const r of rows) {
    const c = rowToSaleCampaign(r);
    if (!byStore.has(c.storeId)) byStore.set(c.storeId, []);
    byStore.get(c.storeId)!.push(c);
  }
  return byStore;
}

export async function applyActiveSales<
  T extends { id: string; storeId: string; gender: string; subCategory: string; basePrice: number; compareAtPrice?: number }
>(products: T[]): Promise<(T & { onSale?: boolean; saleEndsAt?: string })[]> {
  if (products.length === 0) return products;
  const storeIds = [...new Set(products.map((p) => p.storeId))];
  const byStore = await getActiveSaleCampaignsByStore(storeIds);
  if (byStore.size === 0) return products;

  return products.map((p) => {
    const match = byStore.get(p.storeId)?.find((c) => {
      if (c.scope === "all") return true;
      if (c.scope === "category") return c.gender === p.gender && c.subCategory === p.subCategory;
      return c.productIds?.includes(p.id) ?? false;
    });
    if (!match) return p;
    const original = p.basePrice;
    // Rounded to the nearest whole rupee, not the nearest paisa - Indian
    // retail pricing doesn't show paise, and leaving the raw division result
    // (e.g. 20% off ₹1,299 = ₹1,039.2) looked like a rounding bug rather
    // than a deliberate price.
    const discounted =
      match.discountType === "percent" ? Math.round(original * (1 - match.discountValue / 100)) : Math.max(0, Math.round(original - match.discountValue));
    // Whichever is higher becomes the crossed-out "MRP" - a product that
    // already had its own compareAtPrice keeps showing that, one that
    // didn't still shows its real pre-sale price crossed out.
    const compareAtPrice = Math.max(p.compareAtPrice ?? 0, original);
    return { ...p, basePrice: discounted, compareAtPrice, onSale: true, saleEndsAt: match.endsAt };
  });
}

// ---------------------------------------------------------------------
// Reservations - this platform doesn't sell online; a shopper "sorts"
// (picks out) items near them, then reserves them at one store for a fixed
// window so the seller can hold them for an in-person pickup. A shopper's
// own reservation ids are kept client-side in localStorage
// (lib/reservations.ts) since there's no auth to scope a query by.
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
  status: ReservationStatus;
  reservedUntil: string;
  createdAt: string;
}

function rowToReservation(r: any): Reservation {
  return {
    id: r.id,
    storeId: r.store_id,
    storeName: r.store_name,
    storeSlug: r.store_slug,
    items: r.items ?? [],
    total: Number(r.total),
    shopperName: r.shopper_name,
    shopperPhone: r.shopper_phone,
    status: r.status,
    reservedUntil: new Date(r.reserved_until).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

// Thrown inside the transaction below when every requested item fails its
// (re-)checked stock availability - caught by createReservation to return
// null the same way "nothing survived" already did before this function had
// a transaction at all.
class NoStockAvailableError extends Error {}

export async function createReservation(input: {
  storeId: string;
  items: ReservationItem[];
  shopperName: string;
  shopperPhone: string;
  durationMinutes: number;
}): Promise<Reservation | null> {
  const storeRow = await queryOne<any>(`SELECT * FROM stores WHERE id = $1`, [input.storeId]);
  if (!storeRow) return null;
  const store = rowToStore(storeRow);
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + input.durationMinutes * 60_000).toISOString();

  // The stock-sufficiency check and the reservation insert used to be two
  // separate round trips (a plain SELECT-derived count in
  // getProductReservedQuantity, then an unconditional INSERT here) - two
  // concurrent requests for the last unit of the same product could both
  // read "1 available" before either had inserted, and both insert,
  // overbooking it. Locking the relevant product rows with
  // `SELECT ... FOR UPDATE` *inside* the same transaction as both the
  // held-quantity recount and the INSERT forces a second concurrent call
  // for the same product to block until this transaction commits (or rolls
  // back) and then recompute against its actual effect, instead of a stale
  // snapshot - the same pattern createBill uses for its own atomic
  // stock-deduction + bill-insert. Product ids are locked in a fixed (sorted)
  // order so two reservations spanning the same multiple products can never
  // deadlock against each other.
  let reservation: Reservation | null = null;
  try {
    reservation = await withTransaction(async (client) => {
      const productIds = Array.from(new Set(input.items.map((i) => i.productId))).sort();
      const lockedRows = productIds.length
        ? (await client.query(`SELECT id, stock_remaining FROM products WHERE id = ANY($1::text[]) FOR UPDATE`, [productIds])).rows
        : [];
      const stockById = new Map<string, number | null>(lockedRows.map((r: any) => [r.id, r.stock_remaining]));

      // Held quantity is recomputed from inside this same transaction
      // (not via the exported getProductReservedQuantity, which uses the
      // plain pooled `query` helper on a different connection with no
      // lock) - only "pending" reservations whose window hasn't passed yet
      // count, mirroring getProductReservedQuantity/flipIfExpired's own
      // write-on-read expiry logic without needing to perform that write
      // here too.
      const heldById = new Map<string, number>();
      const claimedById = new Map<string, number>();
      const surviving: ReservationItem[] = [];
      for (const item of input.items) {
        const stock = stockById.get(item.productId);
        if (stock != null) {
          if (!heldById.has(item.productId)) {
            const heldRows = await client.query(
              `SELECT items FROM reservations WHERE store_id = $1 AND status = 'pending' AND reserved_until > now()`,
              [input.storeId]
            );
            let held = 0;
            for (const r of heldRows.rows as any[]) {
              for (const it of r.items ?? []) {
                if (it.productId === item.productId) held += it.quantity;
              }
            }
            heldById.set(item.productId, held);
          }
          const held = heldById.get(item.productId)!;
          const claimed = claimedById.get(item.productId) ?? 0;
          const available = stock - held - claimed;
          if (item.quantity > available) continue;
          claimedById.set(item.productId, claimed + item.quantity);
        }
        surviving.push(item);
      }
      if (surviving.length === 0) throw new NoStockAvailableError();

      const res: Reservation = {
        id: `RSV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        items: surviving,
        total: surviving.reduce((sum, i) => sum + i.price * i.quantity, 0),
        shopperName: input.shopperName,
        shopperPhone: input.shopperPhone,
        status: "pending",
        reservedUntil,
        createdAt: now.toISOString(),
      };
      await client.query(
        `INSERT INTO reservations (id, store_id, store_name, store_slug, items, total, shopper_name, shopper_phone, status, reserved_until, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          res.id, res.storeId, res.storeName, res.storeSlug, JSON.stringify(res.items),
          res.total, res.shopperName, res.shopperPhone, res.status, res.reservedUntil, res.createdAt,
        ]
      );
      return res;
    });
  } catch (e) {
    if (e instanceof NoStockAvailableError) return null;
    throw e;
  }
  if (!reservation) return null;

  const itemCount = reservation.items.reduce((sum, i) => sum + i.quantity, 0);
  const pickupTime = new Date(reservation.reservedUntil).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  if (store.phone) {
    await notify(store.id, store.phone, "seller", "reservation_created",
      `New reservation from ${reservation.shopperName} (${reservation.shopperPhone}): ${itemCount} item${itemCount === 1 ? "" : "s"}, ₹${reservation.total}. Reserved until ${pickupTime}.`,
      store.email
    );
  }

  // Confirms the reservation to the shopper too, not just the seller - only
  // real previously there was no shopper-facing notification at creation at
  // all, just the live page they were already on. A guest (no account, no
  // phone match) still gets the in-app/SMS-style log entry; only the real
  // email needs a registered account with one on file.
  const shopper = await findShopperByPhone(reservation.shopperPhone);
  await notify(store.id, reservation.shopperPhone, "shopper", "reservation_created",
    `Your reservation at ${store.name} is confirmed - ${itemCount} item${itemCount === 1 ? "" : "s"}, ₹${reservation.total}. Walk in before ${pickupTime} to pick it up.`,
    shopper?.email
  );

  return reservation;
}

export async function getReservation(id: string): Promise<Reservation | undefined> {
  const row = await queryOne<any>(`SELECT * FROM reservations WHERE id = $1`, [id]);
  if (!row) return undefined;
  return flipIfExpired(rowToReservation(row));
}

export async function getStoreReservations(storeId: string): Promise<Reservation[]> {
  const rows = await query<any>(`SELECT * FROM reservations WHERE store_id = $1 ORDER BY created_at DESC`, [storeId]);
  return Promise.all(rows.map(rowToReservation).map(flipIfExpired));
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Same plain 30-day breakdown as the seller's own reservations page computes
// client-side (app/seller/(dashboard)/reservations/page.tsx's
// computeNoShowStats) - kept here too as a server-callable version so the
// admin seller-detail page can get the same numbers without a client-side
// fetch round-trip. "Uncollected" means expired specifically (never picked
// up, hold lapsed), as opposed to a cancellation (a deliberate shopper
// action). The percentage is of resolved (fulfilled + expired) reservations
// only - one still pending hasn't gone either way yet.
export async function getReservationNoShowStats(storeId: string) {
  const reservations = await getStoreReservations(storeId);
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const recent = reservations.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  const fulfilled = recent.filter((r) => r.status === "fulfilled").length;
  const expired = recent.filter((r) => r.status === "expired").length;
  const cancelled = recent.filter((r) => r.status === "cancelled").length;
  const resolved = fulfilled + expired;
  const uncollectedPercent = resolved > 0 ? Math.round((expired / resolved) * 100) : 0;
  return { fulfilled, expired, cancelled, resolved, uncollectedPercent };
}

// Write-on-read: a "pending" reservation past its reservedUntil window is
// flipped to "expired" in the DB the first time anything reads it, rather
// than only computing that fact ephemerally for display (which would leave
// the stored status "pending" forever and let it keep counting as held
// stock - see getProductReservedQuantity below). No scheduled job does this
// instead, deliberately: Vercel's Hobby plan only runs a cron once a day,
// far too infrequent for a hold window measured in tens of minutes to a few
// hours, so correctness can't depend on anything running on a schedule.
// The `AND status = 'pending'` guards against a race where the row changed
// (fulfilled/cancelled) between the SELECT above and this UPDATE.
async function flipIfExpired(r: Reservation): Promise<Reservation> {
  if (!isPastReservationWindow(r.status, r.reservedUntil)) return r;
  const row = await queryOne<any>(`UPDATE reservations SET status = 'expired' WHERE id = $1 AND status = 'pending' RETURNING *`, [r.id]);
  return row ? rowToReservation(row) : r;
}

// How many units of a product are currently held by *other* active
// (pending, non-expired) reservations at this store - what a NEW
// reservation's stock check needs to subtract from Product.stockRemaining
// on top of whatever stock-tracking a seller's in-store billing already
// does (see createBill). Goes through getStoreReservations so every
// candidate reservation gets the same write-on-read expiry flip first -
// otherwise a pending-but-actually-expired reservation nobody has viewed
// yet would keep "holding" stock indefinitely.
export async function getProductReservedQuantity(storeId: string, productId: string): Promise<number> {
  const reservations = await getStoreReservations(storeId);
  let held = 0;
  for (const r of reservations) {
    if (r.status !== "pending") continue;
    for (const item of r.items) {
      if (item.productId === productId) held += item.quantity;
    }
  }
  return held;
}

// `AND status = 'pending'` guards against two concurrent transitions of the
// same reservation (e.g. a shopper's cancel racing a seller's fulfil, or a
// double-submitted cancel click) both succeeding and both firing a
// notification - only the first caller to land sees a non-null result, the
// loser sees null and reports "no longer pending" instead of silently
// double-transitioning (and double-notifying) the same reservation.
export async function updateReservationStatus(id: string, status: "fulfilled" | "cancelled"): Promise<Reservation | null> {
  const row = await queryOne<any>(`UPDATE reservations SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING *`, [id, status]);
  if (!row) return null;
  const reservation = rowToReservation(row);

  const message =
    status === "fulfilled"
      ? `Thanks for shopping with ${reservation.storeName}! Your order (₹${reservation.total}) has been picked up.`
      : `Your reservation at ${reservation.storeName} (₹${reservation.total}) was cancelled.`;
  const shopper = await findShopperByPhone(reservation.shopperPhone);
  await notify(reservation.storeId, reservation.shopperPhone, "shopper", `reservation_${status}`, message, shopper?.email);

  return reservation;
}

// A pending reservation past its window is effectively expired. The actual
// DB row is now flipped to "expired" the moment anything reads it via
// getReservation/getStoreReservations (see flipIfExpired above), so this is
// mostly a no-op by the time a caller sees it - kept as a defense-in-depth
// fallback for any caller that ends up holding a Reservation object that
// didn't go through that flip (e.g. the one just returned by
// createReservation/updateReservationStatus, read straight from a fresh
// UPDATE ... RETURNING).
export function effectiveReservationStatus(r: Reservation): ReservationStatus {
  if (isPastReservationWindow(r.status, r.reservedUntil)) return "expired";
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
  trigger:
    | "reservation_created"
    | "reservation_fulfilled"
    | "reservation_cancelled"
    | "back_in_stock"
    | "referral_joined"
    | "store_approved"
    | "store_rejected"
    | "store_suspended"
    | "store_reinstated"
    | "product_held"
    | "product_unheld";
  message: string;
  createdAt: string;
}

function rowToNotification(r: any): Notification {
  return {
    id: r.id,
    storeId: r.store_id,
    recipient: r.recipient,
    phone: r.phone,
    trigger: r.trigger,
    message: r.message,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const NOTIFICATION_SUBJECTS: Record<Notification["trigger"], string> = {
  reservation_created: "New reservation on SORT NOW",
  reservation_fulfilled: "Your SORT NOW pickup is complete",
  reservation_cancelled: "Your SORT NOW reservation was cancelled",
  back_in_stock: "Back in stock on SORT NOW",
  referral_joined: "Your SORT NOW referral joined",
  store_approved: "Your store is live on SORT NOW",
  store_rejected: "Your SORT NOW store submission needs another look",
  store_suspended: "Your SORT NOW store has been put on hold",
  store_reinstated: "Your SORT NOW store is live again",
  product_held: "A listing was taken down on SORT NOW",
  product_unheld: "Your listing is live again on SORT NOW",
};

// `email`, when the caller has one on file for this recipient (a store's
// own email, or a shopper's if they're a registered account with one saved),
// sends a real email alongside the existing SMS-style log/in-app record -
// an additional delivery channel, not a replacement. Best-effort: a failed
// or skipped email never blocks the notification itself from being
// recorded, same as how a missing phone number already doesn't block this.
async function notify(storeId: string, phone: string, recipient: "seller" | "shopper", trigger: Notification["trigger"], message: string, email?: string | null): Promise<void> {
  console.log(`[SMS -> +91${phone}] ${message}`);
  const id = `notif-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await query(
    `INSERT INTO notifications (id, store_id, recipient, phone, trigger, message) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, storeId, recipient, phone, trigger, message]
  );
  if (email) {
    sendNotificationEmail(email, NOTIFICATION_SUBJECTS[trigger], message).catch((err) =>
      console.error(`[notify] Failed to send notification email for ${trigger}:`, err)
    );
  }
}

export async function getStoreNotifications(storeId: string): Promise<Notification[]> {
  const rows = await query<any>(`SELECT * FROM notifications WHERE store_id = $1 ORDER BY created_at DESC`, [storeId]);
  return rows.map(rowToNotification);
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

// Rejects a duplicate join (same phone, same product still waiting) rather
// than silently piling up repeat entries every time an impatient shopper
// re-submits the form.
export async function joinWaitlist(productId: string, shopperName: string, shopperPhone: string): Promise<{ ok: true; entry: WaitlistEntry } | { ok: false; error: string }> {
  const productRow = await queryOne<any>(`SELECT id, store_id FROM products WHERE id = $1`, [productId]);
  if (!productRow) return { ok: false, error: "Product not found." };
  const normalized = shopperPhone.replace(/\D/g, "").slice(-10);
  const existingRows = await query<any>(`SELECT shopper_phone FROM waitlist_entries WHERE product_id = $1`, [productId]);
  const already = existingRows.some((r) => r.shopper_phone.replace(/\D/g, "").slice(-10) === normalized);
  if (already) return { ok: false, error: "You're already on the waitlist for this product." };

  const entry: WaitlistEntry = {
    id: `wait-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    productId,
    storeId: productRow.store_id,
    shopperName: shopperName.trim(),
    shopperPhone: normalized,
    createdAt: new Date().toISOString(),
  };
  await query(
    `INSERT INTO waitlist_entries (id, product_id, store_id, shopper_name, shopper_phone, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [entry.id, entry.productId, entry.storeId, entry.shopperName, entry.shopperPhone, entry.createdAt]
  );
  return { ok: true, entry };
}

export async function getProductWaitlistCount(productId: string): Promise<number> {
  const row = await queryOne<any>(`SELECT COUNT(*)::int AS count FROM waitlist_entries WHERE product_id = $1`, [productId]);
  return row?.count ?? 0;
}

// Notifies and clears everyone waiting on a product the moment it goes from
// sold-out to back in stock - called from updateProduct() above, not fired
// on every stock edit (e.g. a seller correcting 8 to 9 shouldn't spam
// anyone who was never actually told "sold out").
async function notifyWaitlistIfRestocked(product: Product, previousStock: number | undefined): Promise<void> {
  if ((previousStock ?? 0) > 0 || (product.stockRemaining ?? 0) <= 0) return;
  const waiting = await query<any>(`SELECT * FROM waitlist_entries WHERE product_id = $1`, [product.id]);
  if (waiting.length === 0) return;
  for (const entry of waiting) {
    await notify(product.storeId, entry.shopper_phone, "shopper", "back_in_stock", `Good news - "${product.title}" is back in stock! Reserve it before it sells out again.`);
  }
  await query(`DELETE FROM waitlist_entries WHERE product_id = $1`, [product.id]);
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
  // Free text, paired with pincode on the profile - a human-readable area
  // name reads better than a bare 6-digit code anywhere this is shown back
  // to the shopper.
  city?: string;
  // YYYY-MM-DD, optional - lets a real deployment send a birthday offer,
  // the one piece of personalization a phone+pincode profile can't give it.
  dateOfBirth?: string;
  // Separate from the Terms & Privacy checkbox (which is mandatory) - this
  // one is an opt-in for promotional contact, off by default, consistent
  // with how a real signup keeps "required to use the service" and "okay to
  // market to me" as two different questions.
  marketingOptIn?: boolean;
  // Optional - OTP alone is always enough to sign in (see
  // /api/v1/auth/otp/verify), so this is purely a convenience for a shopper
  // who'd rather skip the SMS wait next time (see
  // /api/v1/shopper/auth/password-login). scrypt salt+hash, same format as
  // seller passwords - see lib/auth/password.ts.
  passwordHash?: string;
  createdAt: string;
  // Referral program - a shareable code every shopper gets on signup (see
  // /account "Invite friends"). No money changes hands (this platform takes
  // no cut of a sale), so the reward is growing the shopper base itself:
  // more shoppers makes a seller's subscription more worth paying for.
  referralCode: string;
  referredBy?: string;
  // Google's stable per-account "sub" claim, set the first time a shopper
  // uses "Continue with Google" (see /api/v1/auth/google) - undefined for
  // every shopper who has only ever used phone+OTP. Matched on, never shown
  // back to the client.
  googleId?: string;
}

function rowToShopper(r: any): Shopper {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? undefined,
    preferredCategory: r.preferred_category ?? undefined,
    pincode: r.pincode ?? undefined,
    city: r.city ?? undefined,
    dateOfBirth: r.date_of_birth ? new Date(r.date_of_birth).toISOString().slice(0, 10) : undefined,
    marketingOptIn: r.marketing_opt_in ?? false,
    passwordHash: r.password_hash ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
    referralCode: r.referral_code ?? "",
    referredBy: r.referred_by ?? undefined,
    googleId: r.google_id ?? undefined,
  };
}

export async function findShopperByPhone(phone: string): Promise<Shopper | null> {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  const rows = await query<any>(`SELECT * FROM shoppers`);
  const row = rows.find((r) => r.phone.replace(/\D/g, "").slice(-10) === normalized);
  if (!row) return null;
  const shopper = rowToShopper(row);
  // Self-healing backfill for a shopper who signed up before the referral
  // program existed, on whichever code path reads them first (OTP verify,
  // profile update, or the referrals endpoint) - not just the update path
  // in upsertShopper, since a returning login never calls that.
  if (!shopper.referralCode) {
    shopper.referralCode = await generateReferralCode(shopper.name);
    await query(`UPDATE shoppers SET referral_code = $2 WHERE id = $1`, [shopper.id, shopper.referralCode]);
  }
  return shopper;
}

// Persists an email for a returning shopper who didn't have one on file yet
// (signed up before email existed, or skipped the optional field) - used by
// the OTP login flow (see /api/v1/auth/otp/request), which now needs an
// email to actually deliver the code to. A brand-new shopper's email is
// instead saved the normal way, via upsertShopper() in the profile step
// right after verifying for the first time.
export async function updateShopperEmail(shopperId: string, email: string): Promise<void> {
  await execute(`UPDATE shoppers SET email = $2 WHERE id = $1`, [shopperId, email]);
}

// The two lookups "Continue with Google" needs before it knows which shopper
// (if any) a verified Google identity belongs to - see
// /api/v1/auth/google. Tried in that order: a returning Google sign-in
// matches by googleId directly; a shopper who originally signed up by
// phone+OTP but happens to share the same email as their Google account
// matches by email instead (and gets linked, see linkShopperGoogleId).
export async function findShopperByGoogleId(googleId: string): Promise<Shopper | null> {
  const row = await queryOne<any>(`SELECT * FROM shoppers WHERE google_id = $1`, [googleId]);
  return row ? rowToShopper(row) : null;
}

export async function findShopperByEmail(email: string): Promise<Shopper | null> {
  const row = await queryOne<any>(`SELECT * FROM shoppers WHERE email IS NOT NULL AND lower(email) = lower($1)`, [email]);
  return row ? rowToShopper(row) : null;
}

export async function linkShopperGoogleId(shopperId: string, googleId: string): Promise<void> {
  await execute(`UPDATE shoppers SET google_id = $2 WHERE id = $1`, [shopperId, googleId]);
}

export async function findShopperByReferralCode(code: string): Promise<Shopper | null> {
  // Guards against shopper records persisted before referralCode existed
  // (this field is new) - those have no code to match against, not a bug.
  const row = await queryOne<any>(`SELECT * FROM shoppers WHERE referral_code IS NOT NULL AND lower(referral_code) = lower($1)`, [code]);
  return row ? rowToShopper(row) : null;
}

export async function getReferralCount(shopperId: string): Promise<number> {
  const row = await queryOne<any>(`SELECT COUNT(*)::int AS count FROM shoppers WHERE referred_by = $1`, [shopperId]);
  return row?.count ?? 0;
}

async function generateReferralCode(name: string): Promise<string> {
  const base = (name.replace(/[^A-Za-z]/g, "").slice(0, 5) || "SORT").toUpperCase();
  let code = "";
  do {
    code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  } while (await findShopperByReferralCode(code));
  return code;
}

export interface UpsertShopperInput {
  name: string;
  phone: string;
  email?: string;
  preferredCategory?: Gender;
  pincode?: string;
  city?: string;
  dateOfBirth?: string;
  marketingOptIn?: boolean;
  // Plain text in, hashed before storage - optional, and only ever set
  // explicitly (never cleared implicitly by an update that omits it).
  password?: string;
  // Referral code from the invite link (?ref=CODE) the shopper signed up
  // through - only ever applied on first creation, never on a later update.
  referredByCode?: string;
  // Set only by the "Continue with Google" finalize step (see
  // /api/v1/auth/google) when creating a brand-new shopper whose phone
  // wasn't on file yet - links the account to that Google identity from the
  // moment it's created, same as linkShopperGoogleId does for an existing one.
  googleId?: string;
}

// Creates a shopper the first time their phone verifies, or updates the
// existing profile's editable fields on a later sign-in - either way the
// caller gets back the current record plus whether this was a brand-new
// signup, which is what the sign-in page uses to decide whether to show
// the "tell us about you" step.
export async function upsertShopper(input: UpsertShopperInput): Promise<{ shopper: Shopper; isNewCustomer: boolean }> {
  const existing = await findShopperByPhone(input.phone);
  if (existing) {
    const name = input.name.trim() || existing.name;
    const email = input.email !== undefined ? input.email.trim() || undefined : existing.email;
    const preferredCategory = input.preferredCategory !== undefined ? input.preferredCategory : existing.preferredCategory;
    const pincode = input.pincode !== undefined ? input.pincode.trim() || undefined : existing.pincode;
    const city = input.city !== undefined ? input.city.trim() || undefined : existing.city;
    const dateOfBirth = input.dateOfBirth !== undefined ? input.dateOfBirth || undefined : existing.dateOfBirth;
    const marketingOptIn = input.marketingOptIn !== undefined ? input.marketingOptIn : existing.marketingOptIn;
    const passwordHash = input.password ? hashPassword(input.password) : existing.passwordHash;
    await query(
      `UPDATE shoppers SET name=$2, email=$3, preferred_category=$4, pincode=$5, city=$6, date_of_birth=$7, marketing_opt_in=$8, password_hash=$9 WHERE id = $1`,
      [existing.id, name, email ?? null, preferredCategory ?? null, pincode ?? null, city ?? null, dateOfBirth ?? null, marketingOptIn ?? false, passwordHash ?? null]
    );
    const updated: Shopper = { ...existing, name, email, preferredCategory, pincode, city, dateOfBirth, marketingOptIn, passwordHash };
    return { shopper: updated, isNewCustomer: false };
  }
  const referrer = input.referredByCode ? await findShopperByReferralCode(input.referredByCode) : null;
  const shopper: Shopper = {
    id: `shopper-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    phone: input.phone,
    email: input.email?.trim() || undefined,
    preferredCategory: input.preferredCategory,
    pincode: input.pincode?.trim() || undefined,
    city: input.city?.trim() || undefined,
    dateOfBirth: input.dateOfBirth || undefined,
    marketingOptIn: input.marketingOptIn ?? false,
    passwordHash: input.password ? hashPassword(input.password) : undefined,
    createdAt: new Date().toISOString(),
    referralCode: await generateReferralCode(input.name),
    referredBy: referrer?.id,
    googleId: input.googleId,
  };
  await query(
    `INSERT INTO shoppers (id, name, phone, email, preferred_category, pincode, city, date_of_birth, marketing_opt_in, password_hash, created_at, referral_code, referred_by, google_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      shopper.id, shopper.name, shopper.phone, shopper.email ?? null, shopper.preferredCategory ?? null,
      shopper.pincode ?? null, shopper.city ?? null, shopper.dateOfBirth ?? null, shopper.marketingOptIn,
      shopper.passwordHash ?? null, shopper.createdAt, shopper.referralCode, shopper.referredBy ?? null,
      shopper.googleId ?? null,
    ]
  );
  if (referrer) {
    const count = await getReferralCount(referrer.id);
    await notify(
      "platform",
      referrer.phone,
      "shopper",
      "referral_joined",
      `${shopper.name} just joined SORT NOW using your invite link! You've now referred ${count} friend${count === 1 ? "" : "s"}.`,
      referrer.email
    );
  }
  return { shopper, isNewCustomer: true };
}

// Alternative to OTP for a shopper who set a password - OTP always still
// works (see /api/v1/auth/otp/verify) regardless of whether this is set, so
// this is purely a skip-the-SMS-wait convenience, not a second factor.
// Returns null for "wrong phone", "wrong password", and "never set a
// password" alike, same as a seller login's invalid_credentials - nothing
// here should let a caller distinguish those cases.
export async function verifyShopperPassword(phone: string, password: string): Promise<Shopper | null> {
  const shopper = await findShopperByPhone(phone);
  if (!shopper?.passwordHash) return null;
  if (!verifyPassword(password, shopper.passwordHash)) return null;
  return shopper;
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
  // Snapshotted from Product.costPrice at the moment of sale (like
  // unitPrice above) so a later edit to a product's cost never rewrites
  // the profit this bill already reported. Undefined whenever the product
  // had no cost price set - that sale just isn't counted in P&L, rather
  // than silently treating a missing cost as zero profit.
  unitCost?: number;
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
  // Optional overall discount applied before tax - a quick "knock off 10%"
  // for a regular customer, the same everyday haggling a shopkeeper already
  // does, instead of needing to edit each line item's price individually.
  discountPercent?: number;
  discountAmount?: number;
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

function rowToBillingSettings(r: any): BillingSettings {
  return {
    mode: r.mode,
    gstin: r.gstin ?? undefined,
    taxRatePercent: Number(r.tax_rate_percent),
    nextInvoiceNumber: r.next_invoice_number,
    invoiceNote: r.invoice_note ?? undefined,
  };
}

function rowToBill(r: any): Bill {
  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    storeId: r.store_id,
    storeName: r.store_name,
    storeAddress: r.store_address ?? undefined,
    invoiceNote: r.invoice_note ?? undefined,
    mode: r.mode,
    gstin: r.gstin ?? undefined,
    taxRatePercent: Number(r.tax_rate_percent),
    items: r.items ?? [],
    subtotal: Number(r.subtotal),
    discountPercent: r.discount_percent != null ? Number(r.discount_percent) : undefined,
    discountAmount: r.discount_amount != null ? Number(r.discount_amount) : undefined,
    cgst: Number(r.cgst),
    sgst: Number(r.sgst),
    grandTotal: Number(r.grand_total),
    totalQuantity: r.total_quantity,
    paymentMode: r.payment_mode,
    customerName: r.customer_name ?? undefined,
    customerPhone: r.customer_phone ?? undefined,
    status: r.status,
    voidReason: r.void_reason ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const DEFAULT_BILLING_SETTINGS: Omit<BillingSettings, "nextInvoiceNumber"> = { mode: "normal", taxRatePercent: 5 };

export async function getBillingSettings(storeId: string): Promise<BillingSettings> {
  const row = await queryOne<any>(`SELECT * FROM billing_settings WHERE store_id = $1`, [storeId]);
  if (!row) return { ...DEFAULT_BILLING_SETTINGS, nextInvoiceNumber: 1 };
  return rowToBillingSettings(row);
}

export async function updateBillingSettings(
  storeId: string,
  patch: { mode?: "gst" | "normal"; gstin?: string; taxRatePercent?: number; invoiceNote?: string }
): Promise<BillingSettings> {
  const current = await getBillingSettings(storeId);
  const next: BillingSettings = {
    ...current,
    ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
    ...(patch.gstin !== undefined ? { gstin: patch.gstin } : {}),
    ...(patch.taxRatePercent !== undefined ? { taxRatePercent: patch.taxRatePercent } : {}),
    ...(patch.invoiceNote !== undefined ? { invoiceNote: patch.invoiceNote } : {}),
  };
  await query(
    `INSERT INTO billing_settings (store_id, mode, gstin, tax_rate_percent, next_invoice_number, invoice_note)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (store_id) DO UPDATE SET mode=$2, gstin=$3, tax_rate_percent=$4, next_invoice_number=$5, invoice_note=$6`,
    [storeId, next.mode, next.gstin ?? null, next.taxRatePercent, next.nextInvoiceNumber, next.invoiceNote ?? null]
  );
  return next;
}

export type CreateBillResult = { bill: Bill } | { error: string };

// Thrown inside createBill's transaction when a row-locked recheck finds
// stock insufficient - caught right outside the transaction and turned back
// into the same `{ error }` shape every other validation failure in this
// function already returns.
class InsufficientStockError extends Error {}

export async function createBill(input: {
  storeId: string;
  items: { productId: string; quantity: number; size?: string }[];
  paymentMode: "cash" | "upi" | "card" | "other";
  customerName?: string;
  customerPhone?: string;
  discountPercent?: number;
}): Promise<CreateBillResult> {
  const storeRow = await queryOne<any>(`SELECT * FROM stores WHERE id = $1`, [input.storeId]);
  if (!storeRow) return { error: "Store not found." };
  const store = rowToStore(storeRow);
  if (input.items.length === 0) return { error: "Add at least one product to the bill." };
  if (input.discountPercent !== undefined && (input.discountPercent < 0 || input.discountPercent > 100)) {
    return { error: "Discount must be between 0 and 100%." };
  }

  // Resolves/validates shape (product exists, quantity is a positive
  // integer, size is valid) up front - none of that is stock-racy, it's the
  // same regardless of what else might be happening concurrently. Stock
  // *sufficiency* is deliberately NOT checked here against this plain,
  // unlocked `storeProducts` read - that used to be the only check, against
  // a snapshot taken well before the transaction below, which let two
  // concurrent bills both read the same stale stock_remaining and both
  // pass. It's rechecked (and is the only thing that can still reject the
  // bill) inside the transaction, against a `SELECT ... FOR UPDATE`-locked
  // read of the same rows, immediately before the deduction. Tracks how
  // much of each product this same bill has already claimed (e.g. two lines
  // for the same product in different sizes), since the locked check below
  // is against each product's *total* requested quantity across all lines.
  const storeProducts = await getStoreProducts(input.storeId);
  const claimedByProduct = new Map<string, number>();
  const resolved: { product: Product; quantity: number; size?: string }[] = [];
  for (const line of input.items) {
    const product = storeProducts.find((p) => p.id === line.productId);
    if (!product) return { error: `Product ${line.productId} not found in this store.` };
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      return { error: `Invalid quantity for "${product.title}".` };
    }
    if (line.size !== undefined && product.sizes.length > 0 && !product.sizes.includes(line.size)) {
      return { error: `"${line.size}" isn't a valid size for "${product.title}".` };
    }
    const alreadyClaimed = claimedByProduct.get(product.id) ?? 0;
    claimedByProduct.set(product.id, alreadyClaimed + line.quantity);
    resolved.push({ product, quantity: line.quantity, size: line.size });
  }

  const items: BillItem[] = resolved.map(({ product, quantity, size }) => ({
    productId: product.id,
    title: product.title,
    size,
    quantity,
    unitPrice: product.basePrice,
    total: product.basePrice * quantity,
    unitCost: product.costPrice,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const discountPercent = input.discountPercent || undefined;
  const discountAmount = discountPercent ? Math.round(subtotal * discountPercent) / 100 : 0;
  const taxableAmount = subtotal - discountAmount;

  const settings = await getBillingSettings(input.storeId);
  const isGst = settings.mode === "gst";
  const taxRatePercent = isGst ? settings.taxRatePercent : 0;
  const totalTax = isGst ? Math.round(taxableAmount * taxRatePercent) / 100 : 0;
  const cgst = Math.round(totalTax * 50) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100;

  const invoiceNumber = `${isGst ? "GST" : "RCPT"}-${String(settings.nextInvoiceNumber).padStart(5, "0")}`;

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
    discountPercent,
    discountAmount: discountAmount || undefined,
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

  // Row-locked recheck, stock deduction, invoice-counter bump, and the bill
  // row itself all commit together - a crash partway through must never
  // leave stock decremented with no bill to show for it (or vice versa),
  // and the lock below must never be held any longer than this one
  // transaction.
  try {
    await withTransaction(async (client) => {
      const productIds = Array.from(claimedByProduct.keys()).sort();
      const lockedRows = (
        await client.query(`SELECT id, stock_remaining FROM products WHERE id = ANY($1::text[]) FOR UPDATE`, [productIds])
      ).rows as { id: string; stock_remaining: number | null }[];
      const stockById = new Map(lockedRows.map((r) => [r.id, r.stock_remaining]));
      const productById = new Map(resolved.map(({ product }) => [product.id, product]));

      for (const [productId, totalQuantity] of claimedByProduct) {
        const available = stockById.get(productId) ?? 0;
        if (totalQuantity > available) {
          const product = productById.get(productId);
          throw new InsufficientStockError(`Only ${available} left in stock for "${product?.title ?? productId}".`);
        }
      }

      for (const { product, quantity } of resolved) {
        await client.query(`UPDATE products SET stock_remaining = COALESCE(stock_remaining, 0) - $2 WHERE id = $1`, [product.id, quantity]);
      }
      await client.query(
        `INSERT INTO billing_settings (store_id, mode, gstin, tax_rate_percent, next_invoice_number, invoice_note)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (store_id) DO UPDATE SET next_invoice_number = $5`,
        [input.storeId, settings.mode, settings.gstin ?? null, settings.taxRatePercent, settings.nextInvoiceNumber + 1, settings.invoiceNote ?? null]
      );
      await client.query(
        `INSERT INTO bills (id, invoice_number, store_id, store_name, store_address, invoice_note, mode, gstin, tax_rate_percent, items, subtotal, discount_percent, discount_amount, cgst, sgst, grand_total, total_quantity, payment_mode, customer_name, customer_phone, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          bill.id, bill.invoiceNumber, bill.storeId, bill.storeName, bill.storeAddress ?? null, bill.invoiceNote ?? null,
          bill.mode, bill.gstin ?? null, bill.taxRatePercent, JSON.stringify(bill.items), bill.subtotal, bill.discountPercent ?? null,
          bill.discountAmount ?? null, bill.cgst, bill.sgst, bill.grandTotal, bill.totalQuantity, bill.paymentMode,
          bill.customerName ?? null, bill.customerPhone ?? null, bill.status, bill.createdAt,
        ]
      );
    });
  } catch (e) {
    if (e instanceof InsufficientStockError) return { error: e.message };
    throw e;
  }

  // notifyWaitlistIfRestocked is never relevant here (a sale only ever
  // decreases stock), matching the original in-memory createBill, which
  // deducted stockRemaining directly rather than going through
  // updateProduct().

  return { bill };
}

export async function getBill(id: string): Promise<Bill | undefined> {
  const row = await queryOne<any>(`SELECT * FROM bills WHERE id = $1`, [id]);
  return row ? rowToBill(row) : undefined;
}

export async function getStoreBills(storeId: string): Promise<Bill[]> {
  const rows = await query<any>(`SELECT * FROM bills WHERE store_id = $1 ORDER BY created_at DESC`, [storeId]);
  return rows.map(rowToBill);
}

// Restocks every line item - a void means the sale didn't actually happen
// (rung up by mistake, or a full return), so the stock deducted at billing
// time needs to come back for online listings to stay accurate. An
// already-void bill can't be voided again.
export async function voidBill(id: string, reason: string): Promise<Bill | null> {
  const row = await queryOne<any>(`SELECT * FROM bills WHERE id = $1`, [id]);
  if (!row) return null;
  const bill = rowToBill(row);
  if (bill.status === "void") return null;
  // Goes through updateProduct (same as any other stock change) rather than
  // mutating stock_remaining directly, so a void that brings a sold-out
  // product back into stock also runs notifyWaitlistIfRestocked - shoppers
  // who joined the waitlist while this bill held the last unit otherwise
  // never heard it came back.
  for (const item of bill.items) {
    const productRow = await queryOne<any>(`SELECT stock_remaining FROM products WHERE id = $1`, [item.productId]);
    if (productRow) {
      await updateProduct(item.productId, { stockRemaining: (productRow.stock_remaining ?? 0) + item.quantity });
    }
  }
  await query(`UPDATE bills SET status = 'void', void_reason = $2 WHERE id = $1`, [id, reason]);
  bill.status = "void";
  bill.voidReason = reason;
  return bill;
}

// ---------------------------------------------------------------------
// Billing: plans, subscriptions, GST invoices - matches
// docs/04-monetization-and-billing.md. No real PSP (Razorpay/Cashfree) is
// called - "subscribing" just flips the stored plan.
//
// Launch promotion: every store's first FREE_TRIAL_MONTHS are free on
// whichever plan they pick, counted from activatedAt (when the site owner
// actually approved them, not signup/draft - a store sitting in
// pending_review shouldn't burn its free window before it can even list
// anything). Derived at read time from that one timestamp, the same
// "compute it from a stored instant, don't track a separate flag" pattern
// already used for reservation expiry and sale campaigns - there's nothing
// to expire/flip on a schedule, a date comparison is always correct.
// ---------------------------------------------------------------------
export const FREE_TRIAL_MONTHS = 6;

export function freeTrialEndsAt(activatedAt?: string | null): string | null {
  if (!activatedAt) return null;
  const end = new Date(activatedAt);
  end.setMonth(end.getMonth() + FREE_TRIAL_MONTHS);
  return end.toISOString();
}

export function isInFreeTrial(activatedAt?: string | null): boolean {
  const end = freeTrialEndsAt(activatedAt);
  return !!end && Date.now() < new Date(end).getTime();
}

// Pricing is purely SKU-volume based now - no feature gating (QR Marketing,
// Theme Studio, etc. are free seller tools regardless of plan and always
// have been; the old feature bullet lists never actually gated anything in
// code, they were just copy).
//
// perListingPrice is always a reference stat only - "what that works out to
// per SKU if fully used" (monthlyPrice / includedSkus) - never charged on
// its own. overagePrice is the real, billed rate: null means the plan
// hard-caps at includedSkus with nothing metered past it (Pro); a number
// means every SKU past includedSkus is charged at that rate. Flex has no
// included tier at all (includedSkus: 0) and its overagePrice equals its
// perListingPrice, since with nothing free to use up, "the reference stat"
// and "the real charge" are the same number from SKU 1 - true
// pay-as-you-go. Max's overagePrice (₹1.50) is deliberately lower than its
// own perListingPrice (₹1.75) - a volume discount on top of what the flat
// fee already buys.
export interface Plan {
  code: "flex" | "pro" | "max";
  name: string;
  skuBand: string;
  includedSkus: number;
  monthlyPrice: number;
  perListingPrice: number;
  overagePrice: number | null;
}

export const PLANS: Plan[] = [
  { code: "flex", name: "Flex", skuBand: "0+", includedSkus: 0, monthlyPrice: 0, perListingPrice: 3.0, overagePrice: 3.0 },
  { code: "pro", name: "Pro", skuBand: "Up to 1,000", includedSkus: 1000, monthlyPrice: 1999, perListingPrice: 2.0, overagePrice: null },
  { code: "max", name: "Max", skuBand: "Up to 2,000", includedSkus: 2000, monthlyPrice: 3499, perListingPrice: 1.75, overagePrice: 1.5 },
];

// What a store would actually owe this month on `plan` for `skuCount`
// listings - the flat monthly fee, plus (only for a plan with a real
// overagePrice) that rate on whatever's past includedSkus. Pro has no
// overagePrice, so this is always just its flat fee regardless of skuCount.
//
// waiveMonthlyFee (the free launch trial) only zeroes the flat subscription
// fee - any metered overage (Max past 2,000 SKUs, or Flex's per-listing
// charge on every SKU) still applies. The trial waives the cost of
// subscribing, not the cost of actually using more than what's included -
// otherwise a seller could dodge all billing indefinitely just by listing
// enough SKUs on Max during the free window.
export function estimateMonthlyCost(plan: Plan, skuCount: number, waiveMonthlyFee = false): number {
  const overageSkus = plan.overagePrice != null ? Math.max(0, skuCount - plan.includedSkus) : 0;
  return (waiveMonthlyFee ? 0 : plan.monthlyPrice) + overageSkus * (plan.overagePrice ?? 0);
}

interface Subscription {
  storeId: string;
  planCode: Plan["code"];
  status: "active" | "past_due";
  currentPeriodEnd: string;
}

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// `activatedAt` only matters for the no-subscription-row fallback below - a
// store that's never made an explicit plan choice defaults to Max (free)
// while its launch trial is running, since that's the whole point of the
// promotion, or Flex (no commitment, pay per listing) once it's over. A
// store that HAS made an explicit choice (changePlan, below) always shows
// that instead, trial or not.
export async function getSubscription(storeId: string, activatedAt?: string | null): Promise<Subscription> {
  const row = await queryOne<any>(`SELECT * FROM subscriptions WHERE store_id = $1`, [storeId]);
  if (!row) {
    const planCode = isInFreeTrial(activatedAt) ? "max" : "flex";
    return { storeId, planCode, status: "active", currentPeriodEnd: futureDate(30) };
  }
  return {
    storeId: row.store_id,
    planCode: row.plan_code,
    status: row.status,
    currentPeriodEnd: new Date(row.current_period_end).toISOString(),
  };
}

export async function changePlan(storeId: string, planCode: Plan["code"]): Promise<Subscription | null> {
  if (!PLANS.some((p) => p.code === planCode)) return null;
  const current = await getSubscription(storeId);
  const next: Subscription = { ...current, planCode, status: "active" };
  await query(
    `INSERT INTO subscriptions (store_id, plan_code, status, current_period_end) VALUES ($1,$2,$3,$4)
     ON CONFLICT (store_id) DO UPDATE SET plan_code = $2, status = $3`,
    [storeId, next.planCode, next.status, next.currentPeriodEnd]
  );
  return next;
}

// ---------------------------------------------------------------------
// Store Boost: a direct answer to "how do I make money from traffic" - a
// seller can pay to rank first in "Stores near you" and /shops for a fixed
// window, turning the platform's one non-subscription revenue lever. Same
// "flip a flag, no real payment processor" convention as changePlan()/
// photo credits - a real deployment would redirect to a payment gateway's
// checkout here instead.
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

export async function boostStore(storeId: string, days: number): Promise<Store | null> {
  // Stacks onto any remaining boosted time rather than overwriting it, so
  // buying another package before the current one expires extends it
  // instead of wasting the days already paid for. This used to be a plain
  // read of boosted_until, a stack-or-restart decision made in JS, then a
  // separate UPDATE - two concurrent purchases could both read the same
  // "boosted until X" snapshot and both compute the same base, so the
  // second purchase's days were silently lost instead of stacking on top of
  // the first. The CASE here runs as part of one atomic UPDATE statement
  // against the row Postgres is already locking for that statement, so a
  // second concurrent UPDATE on the same row waits for the first to commit
  // and then reads *its* result, not a stale snapshot.
  const row = await queryOne<any>(
    `UPDATE stores
     SET boosted_until = (CASE WHEN boosted_until IS NOT NULL AND boosted_until > now() THEN boosted_until ELSE now() END) + make_interval(days => $2::int)
     WHERE id = $1
     RETURNING *`,
    [storeId, days]
  );
  return row ? rowToStore(row) : null;
}

// ---------------------------------------------------------------------
// Gemini API key (bring-your-own-key): the mannequin-placement step in
// lib/ai-photo-enhance.ts is a real generative-AI call with a per-call cost
// on whoever's Google Cloud bill it runs against. This used to run on the
// platform's own shared key, metered against a "photo credits" balance a
// seller bought from SORT NOW (fake pricing, no real payment processor ever
// wired up - see git history). That meant SORT NOW was the one taking
// money for Google's usage, however nominally. Now each seller supplies
// their own Gemini API key (from https://aistudio.google.com/app/apikey,
// free to create) and the mannequin call runs against *that* key - nothing
// is metered or charged by SORT NOW. Google doesn't offer a free tier for
// this kind of image generation (confirmed against ai.google.dev/gemini-api/
// docs/pricing - every "Nano Banana" image model is paid-tier only), so this
// is a real, small charge (a few US cents per image) the seller pays Google
// directly, not something they can avoid by staying under a free quota.
//
// Deliberately NOT part of the Store interface/rowToStore - every other
// Store field flows through getAllStores() into plenty of shopper-facing
// responses (search results, product detail, store pages), and this one
// must never leak into any of those. Only these two narrow functions ever
// touch the column, and neither is called from a shopper-facing path.
//
// No encryption-at-rest here - this is the first plaintext-sensitive
// column in this schema (seller_password_hash is a one-way hash, not
// comparable), and this pilot has no secret-management/KMS setup to do it
// properly. Worth revisiting before handling real sellers' keys at scale.
export async function getGeminiApiKey(storeId: string): Promise<string | null> {
  const row = await queryOne<any>(`SELECT gemini_api_key FROM stores WHERE id = $1`, [storeId]);
  return row?.gemini_api_key ?? null;
}

// `key: null` clears it - the settings UI's "Remove key" action.
export async function updateStoreGeminiKey(storeId: string, key: string | null): Promise<void> {
  await execute(`UPDATE stores SET gemini_api_key = $2 WHERE id = $1`, [storeId, key]);
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

async function computeGstInvoice(storeId: string, taxableValue: number, placeOfSupplyStateCode: string, issuedAt: string): Promise<GstInvoice> {
  const sameState = placeOfSupplyStateCode === PLATFORM_STATE_CODE;
  const cgst = sameState ? Math.round((taxableValue * GST_RATE) / 200) : 0;
  const sgst = sameState ? Math.round((taxableValue * GST_RATE) / 200) : 0;
  const igst = sameState ? 0 : Math.round((taxableValue * GST_RATE) / 100);
  const sub = await getSubscription(storeId);
  return {
    id: `INV-${new Date(issuedAt).getFullYear()}-${Math.abs(hashCode(storeId + issuedAt)) % 100000}`,
    storeId,
    planCode: sub.planCode,
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

export async function getInvoicesForStore(storeId: string): Promise<GstInvoice[]> {
  const sub = await getSubscription(storeId);
  const plan = PLANS.find((p) => p.code === sub.planCode) ?? PLANS[0];
  const stateCode = STORE_STATE_CODES[storeId] ?? PLATFORM_STATE_CODE;
  return Promise.all(
    [1, 2, 3].map((monthsAgo) =>
      computeGstInvoice(storeId, plan.monthlyPrice, stateCode, new Date(Date.now() - monthsAgo * 30 * 24 * 60 * 60 * 1000).toISOString())
    )
  );
}

// ---------------------------------------------------------------------
// Analytics: tracks page views (with src/pos query params, for QR-vs-online
// attribution per docs/03-multi-tenant-storefront.md §4) so the Seller
// Portal's Analytics tab has real numbers instead of placeholders.
// ---------------------------------------------------------------------
export interface AnalyticsEvent {
  storeId: string;
  eventType: "page_view" | "qr_scan";
  qrPosition?: string;
  occurredAt: string;
}

function rowToAnalyticsEvent(r: any): AnalyticsEvent {
  return {
    storeId: r.store_id,
    eventType: r.event_type,
    qrPosition: r.qr_position ?? undefined,
    occurredAt: new Date(r.occurred_at).toISOString(),
  };
}

// Hard cap independent of the API route's rate limiting - keeps the table
// bounded even if that limit is bypassed (e.g. spread across many IPs), by
// dropping the oldest events once the log gets large.
const MAX_ANALYTICS_EVENTS = 20_000;

export async function trackPageView(storeId: string, qrPosition?: string): Promise<void> {
  const now = new Date().toISOString();
  await query(`INSERT INTO analytics_events (store_id, event_type, occurred_at) VALUES ($1, 'page_view', $2)`, [storeId, now]);
  if (qrPosition) {
    await query(`INSERT INTO analytics_events (store_id, event_type, qr_position, occurred_at) VALUES ($1, 'qr_scan', $2, $3)`, [storeId, qrPosition, now]);
  }
  const countRow = await queryOne<any>(`SELECT COUNT(*)::int AS count FROM analytics_events`);
  const overflow = (countRow?.count ?? 0) - MAX_ANALYTICS_EVENTS;
  if (overflow > 0) {
    await query(
      `DELETE FROM analytics_events WHERE id IN (SELECT id FROM analytics_events ORDER BY occurred_at ASC, id ASC LIMIT $1)`,
      [overflow]
    );
  }
}

export async function getStoreAnalytics(storeId: string) {
  const rows = await query<any>(`SELECT * FROM analytics_events WHERE store_id = $1`, [storeId]);
  const events = rows.map(rowToAnalyticsEvent);
  const pageViews = events.filter((e) => e.eventType === "page_view");
  const qrScans = events.filter((e) => e.eventType === "qr_scan");

  const byPosition: Record<string, number> = {};
  for (const e of qrScans) {
    const key = e.qrPosition ?? "Unknown";
    byPosition[key] = (byPosition[key] ?? 0) + 1;
  }

  // Counted from pageViews, not the combined `events` - a QR-code visit logs
  // both a page_view and a qr_scan event for the same single visit (see
  // trackPageView), so counting every event here double-counted each QR
  // visit against totalPageViews below, which only counts page_view events.
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const count = pageViews.filter((e) => e.occurredAt.slice(0, 10) === key).length;
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
export async function getSalesAnalytics(storeId: string) {
  // Void bills didn't result in an actual sale - excluded from every
  // figure here, same as they'd be excluded from a real books/ledger view.
  const storeBills = (await getStoreBills(storeId)).filter((b) => b.status === "issued");

  const totalRevenue = storeBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalBills = storeBills.length;
  const billQuantity = (b: Bill) => b.totalQuantity ?? b.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalItemsSold = storeBills.reduce((sum, b) => sum + billQuantity(b), 0);

  // A bill's discountPercent is applied to the whole subtotal, not per line
  // (see createBill) - so a line item's own realized revenue is its own
  // pre-tax total scaled down by that same bill-wide discount factor, not
  // the sticker-price `item.total` on its own. Without this, a heavily
  // discounted bill's items counted as full-price revenue here even though
  // grandTotal (used everywhere else, e.g. totalRevenue below) already
  // reflects the discount - overstating per-product revenue and profit.
  const revenueByProduct = new Map<string, { title: string; quantity: number; revenue: number }>();
  for (const bill of storeBills) {
    const discountFactor = 1 - (bill.discountPercent ?? 0) / 100;
    for (const item of bill.items) {
      const realizedRevenue = Math.round(item.total * discountFactor * 100) / 100;
      const existing = revenueByProduct.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += realizedRevenue;
      } else {
        revenueByProduct.set(item.productId, { title: item.title, quantity: item.quantity, revenue: realizedRevenue });
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

  // Profit & loss - only possible for line items sold while their product
  // had a cost price set (see Product.costPrice), since cost is optional
  // and this app has no other way to know what a seller paid for an item.
  // Computed from each item's pre-tax total (not the GST-inclusive
  // grandTotal) since tax collected on a shopper's behalf was never the
  // seller's margin to begin with.
  let costedRevenue = 0;
  let totalCost = 0;
  let itemsWithCostSold = 0;
  for (const bill of storeBills) {
    // Same bill-wide discount factor as revenueByProduct above - a
    // discounted sale's realized revenue is lower than item.total, but what
    // the seller actually paid for the item (unitCost) is unaffected by the
    // discount they chose to give the shopper.
    const discountFactor = 1 - (bill.discountPercent ?? 0) / 100;
    for (const item of bill.items) {
      if (item.unitCost == null) continue;
      costedRevenue += item.total * discountFactor;
      totalCost += item.unitCost * item.quantity;
      itemsWithCostSold += item.quantity;
    }
  }
  const totalProfit = Math.round((costedRevenue - totalCost) * 100) / 100;
  const profitMarginPercent = costedRevenue > 0 ? Math.round((totalProfit / costedRevenue) * 1000) / 10 : 0;

  // One bucket per calendar month a bill was issued in (not just the last
  // 7 days, like last7Days above) - a seller comparing "how did this month
  // go vs last month" or pulling a year's numbers together needs the full
  // history, not a rolling week.
  const monthly = new Map<string, { revenue: number; cost: number; itemsWithCostSold: number; totalItemsSold: number }>();
  for (const bill of storeBills) {
    const monthKey = bill.createdAt.slice(0, 7); // "YYYY-MM"
    const discountFactor = 1 - (bill.discountPercent ?? 0) / 100;
    const entry = monthly.get(monthKey) ?? { revenue: 0, cost: 0, itemsWithCostSold: 0, totalItemsSold: 0 };
    for (const item of bill.items) {
      entry.totalItemsSold += item.quantity;
      if (item.unitCost != null) {
        entry.revenue += item.total * discountFactor;
        entry.cost += item.unitCost * item.quantity;
        entry.itemsWithCostSold += item.quantity;
      }
    }
    monthly.set(monthKey, entry);
  }
  const monthlyProfitAndLoss = [...monthly.entries()]
    .map(([month, v]) => {
      const profit = Math.round((v.revenue - v.cost) * 100) / 100;
      const marginPercent = v.revenue > 0 ? Math.round((profit / v.revenue) * 1000) / 10 : 0;
      return {
        month,
        revenue: Math.round(v.revenue * 100) / 100,
        cost: Math.round(v.cost * 100) / 100,
        profit,
        marginPercent,
        itemsWithCostSold: v.itemsWithCostSold,
        totalItemsSold: v.totalItemsSold,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  return {
    totalRevenue,
    totalBills,
    totalItemsSold,
    topProducts,
    last7Days,
    byPaymentMode,
    repeatCustomers,
    profitAndLoss: {
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit,
      profitMarginPercent,
      itemsWithCostSold,
      totalItemsSold,
      monthly: monthlyProfitAndLoss,
    },
  };
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

function rowToReview(r: any): Review {
  return {
    id: r.id,
    productId: r.product_id,
    authorName: r.author_name,
    rating: r.rating,
    title: r.title ?? undefined,
    comment: r.comment,
    verifiedPurchase: r.verified_purchase,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  const rows = await query<any>(`SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC`, [productId]);
  return rows.map(rowToReview);
}

export async function getRatingSummary(productId: string) {
  const productReviews = await getProductReviews(productId);
  const count = productReviews.length;
  const average = count === 0 ? 0 : Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: productReviews.filter((r) => r.rating === star).length,
  }));
  return { average, count, breakdown };
}

export async function addReview(productId: string, input: { authorName: string; rating: number; title?: string; comment: string }): Promise<Review> {
  const review: Review = {
    id: `rev-custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    productId,
    authorName: input.authorName || "Anonymous",
    rating: Math.min(5, Math.max(1, input.rating)),
    title: input.title,
    comment: input.comment,
    verifiedPurchase: false,
    createdAt: new Date().toISOString(),
  };
  await query(
    `INSERT INTO reviews (id, product_id, author_name, rating, title, comment, verified_purchase, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [review.id, review.productId, review.authorName, review.rating, review.title ?? null, review.comment, review.verifiedPurchase, review.createdAt]
  );
  return review;
}

// ---------------------------------------------------------------------
// Store reviews - a shopper rating the shop itself (service, authenticity,
// how the pickup/reservation experience went), not any one product. Kept
// as its own table rather than folded into `reviews` above since a shop
// review has no productId to hang off of.
// ---------------------------------------------------------------------
export interface StoreReview {
  id: string;
  storeId: string;
  authorName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

function rowToStoreReview(r: any): StoreReview {
  return {
    id: r.id,
    storeId: r.store_id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function getStoreReviews(storeId: string): Promise<StoreReview[]> {
  const rows = await query<any>(`SELECT * FROM store_reviews WHERE store_id = $1 ORDER BY created_at DESC`, [storeId]);
  return rows.map(rowToStoreReview);
}

export async function addStoreReview(storeId: string, input: { authorName: string; rating: number; comment: string }): Promise<StoreReview> {
  const review: StoreReview = {
    id: `storerev-custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    storeId,
    authorName: input.authorName || "Anonymous",
    rating: Math.min(5, Math.max(1, input.rating)),
    comment: input.comment,
    createdAt: new Date().toISOString(),
  };
  await query(
    `INSERT INTO store_reviews (id, store_id, author_name, rating, comment, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [review.id, review.storeId, review.authorName, review.rating, review.comment, review.createdAt]
  );
  return review;
}

// A trust signal for the store as a whole (like a shop's Google rating),
// not just one product - important on a marketplace of many small, mostly
// unknown-to-the-shopper sellers, where "is this shop reliable" matters as
// much as "is this specific item good". Blends every review left on any of
// the store's products with direct shop reviews (service/experience,
// rather than any one item) into a single number, since a shopper reading
// "4.6 stars" on a store page doesn't think in terms of two separate
// rating systems.
export async function getStoreRatingSummary(storeId: string): Promise<{ average: number; count: number; breakdown: { star: number; count: number }[] }> {
  const storeProducts = await getStoreProducts(storeId);
  const productIds = storeProducts.map((p) => p.id);
  const productRatingRows = productIds.length
    ? await query<any>(`SELECT rating FROM reviews WHERE product_id = ANY($1)`, [productIds])
    : [];
  const storeReviewList = await getStoreReviews(storeId);
  const ratings = [...productRatingRows.map((r) => r.rating as number), ...storeReviewList.map((r) => r.rating)];
  const count = ratings.length;
  const average = count === 0 ? 0 : Math.round((ratings.reduce((sum, r) => sum + r, 0) / count) * 10) / 10;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({ star, count: ratings.filter((r) => r === star).length }));
  return { average, count, breakdown };
}

// Similar products - same gender + subCategory, excluding the product itself,
// nearest-priced first so recommendations feel relevant rather than random.
export async function getSimilarProducts(productId: string, limit = 4) {
  const productRow = await queryOne<any>(`SELECT * FROM products WHERE id = $1`, [productId]);
  if (!productRow) return [];
  const product = rowToProduct(productRow);

  const rows = await query<any>(
    `SELECT p.*, s.name AS _store_name FROM products p
     JOIN stores s ON s.id = p.store_id
     WHERE p.id != $1 AND p.gender = $2 AND p.sub_category = $3 AND s.status = 'active' AND p.status = 'live'`,
    [productId, product.gender, product.subCategory]
  );

  return rows
    .map((r) => ({ ...rowToProduct(r), storeName: r._store_name as string }))
    .sort((a, b) => Math.abs(a.basePrice - product.basePrice) - Math.abs(b.basePrice - product.basePrice))
    .slice(0, limit)
    .map(({ costPrice: _costPrice, ...p }) => p);
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
export async function getComplementaryProducts(productId: string, limit = 4) {
  const productRow = await queryOne<any>(`SELECT * FROM products WHERE id = $1`, [productId]);
  if (!productRow) return [];
  const product = rowToProduct(productRow);
  const storeRow = await queryOne<any>(`SELECT * FROM stores WHERE id = $1`, [product.storeId]);
  if (!storeRow) return [];
  const store = rowToStore(storeRow);

  const targetSubcats = ACCESSORY_SUBCATEGORIES[product.gender].includes(product.subCategory)
    ? CATEGORY_TREE.find((c) => c.value === product.gender)!.subCategories.filter((sc) => !ACCESSORY_SUBCATEGORIES[product.gender].includes(sc))
    : ACCESSORY_SUBCATEGORIES[product.gender];

  if (targetSubcats.length === 0) return [];

  const rows = await query<any>(
    `SELECT p.*, s.name AS _store_name, s.local_market AS _local_market, s.city AS _city
     FROM products p JOIN stores s ON s.id = p.store_id
     WHERE p.store_id != $1 AND p.gender = $2 AND p.sub_category = ANY($3) AND s.status = 'active' AND p.status = 'live'`,
    [product.storeId, product.gender, targetSubcats]
  );
  const candidates = rows.map((r) => ({
    ...rowToProduct(r),
    storeName: r._store_name as string,
    _localMarket: r._local_market as string,
    _city: r._city as string,
  }));

  const tiers = [
    candidates.filter((p) => p._localMarket === store.localMarket),
    candidates.filter((p) => p._city === store.city),
    candidates,
  ];
  const pool = tiers.find((t) => t.length > 0) ?? [];
  return pool.slice(0, limit).map(({ _localMarket, _city, costPrice: _costPrice, ...p }) => p);
}

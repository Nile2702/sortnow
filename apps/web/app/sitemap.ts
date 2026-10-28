import { MetadataRoute } from "next";
import { getAllStores, getAllProducts } from "../lib/seed-data";
import { SITE_URL as BASE_URL } from "../lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/shops`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/category/men`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/category/women`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/category/kids`, changeFrequency: "daily", priority: 0.7 },
  ];

  // This route is statically generated at BUILD time - a real incident
  // already happened here once (an earlier version of decryptField, called
  // transitively via getAllStores' rowToStore, threw on a missing
  // encryption key and silently failed every Vercel build for several
  // deploys in a row, since a failed static route fails the whole build).
  // That specific trigger is fixed, but this route also depends directly on
  // the database connection (DATABASE_URL, via lib/db.ts), which is a
  // second, independent way the exact same failure shape could happen
  // again - a bad/rotated connection string, or Neon being briefly
  // unreachable mid-build. Degrading to just the static routes on any DB
  // error means a database hiccup costs this deploy an incomplete sitemap
  // for a few minutes, not the entire site silently freezing on an old
  // build with no visible error.
  let stores: Awaited<ReturnType<typeof getAllStores>> = [];
  let products: Awaited<ReturnType<typeof getAllProducts>> = [];
  try {
    [stores, products] = await Promise.all([getAllStores(), getAllProducts()]);
  } catch (err) {
    console.error("[sitemap] Failed to load stores/products - falling back to static routes only:", err);
    return staticRoutes;
  }

  const activeStoreIds = new Set(stores.filter((s) => s.status === "active").map((s) => s.id));

  const storeRoutes: MetadataRoute.Sitemap = stores
    .filter((s) => s.status === "active")
    .map((s) => ({ url: `${BASE_URL}/store/${s.slug}`, changeFrequency: "daily", priority: 0.6 }));

  // A held product, or one belonging to a non-active (suspended/draft/...)
  // store, 404s on both the product API and page - listing it here would
  // just hand search engines a dead link.
  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.status !== "on_hold" && activeStoreIds.has(p.storeId))
    .map((p) => ({
      url: `${BASE_URL}/product/${p.id}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  return [...staticRoutes, ...storeRoutes, ...productRoutes];
}

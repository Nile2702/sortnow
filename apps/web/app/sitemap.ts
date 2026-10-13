import { MetadataRoute } from "next";
import { getAllStores, getAllProducts } from "../lib/seed-data";

const BASE_URL = "https://sortitout.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await getAllStores();
  const products = await getAllProducts();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/shops`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/category/men`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/category/women`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/category/kids`, changeFrequency: "daily", priority: 0.7 },
  ];

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

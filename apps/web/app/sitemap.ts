import { MetadataRoute } from "next";
import { stores, products } from "../lib/seed-data";

const BASE_URL = "https://sortitout.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/shops`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/category/men`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/category/women`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/category/kids`, changeFrequency: "daily", priority: 0.7 },
  ];

  const storeRoutes: MetadataRoute.Sitemap = stores
    .filter((s) => s.status === "active")
    .map((s) => ({ url: `${BASE_URL}/store/${s.slug}`, changeFrequency: "daily", priority: 0.6 }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/product/${p.id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...storeRoutes, ...productRoutes];
}

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/seller", "/seller/", "/api/"] },
    ],
    sitemap: "https://sortitout.in/sitemap.xml",
  };
}

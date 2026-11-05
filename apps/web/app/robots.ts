import { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /seller/signup and /seller/login are the public "list your shop"
        // marketing/auth pages - everything else under /seller is the
        // private seller dashboard, which should stay out of search. Google
        // resolves an allow/disallow conflict by taking the longer (more
        // specific) path, so these two win over the broader /seller/ disallow.
        allow: ["/", "/seller/signup", "/seller/login"],
        disallow: ["/seller", "/seller/", "/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

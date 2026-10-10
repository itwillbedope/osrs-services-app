import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/public";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/login",
        "/account/",
        "/api/",
        "/cart",
        "/checkout",
        "/orders",
        "/request",
        "/custom-account-build",
      ],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}

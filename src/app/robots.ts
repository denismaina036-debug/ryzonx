import type { MetadataRoute } from "next";
import { CANONICAL_SITE_URL } from "@/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/logo.png",
          "/images/",
          "/favicon.ico",
          "/favicon-16x16.png",
          "/favicon-32x32.png",
          "/apple-touch-icon.png",
          "/android-chrome-192x192.png",
          "/android-chrome-512x512.png",
          "/site.webmanifest",
        ],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/pool-manager/",
          "/api/",
          "/auth/callback",
        ],
      },
    ],
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
    host: CANONICAL_SITE_URL,
  };
}

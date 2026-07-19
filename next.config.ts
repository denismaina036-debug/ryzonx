import type { NextConfig } from "next";
import { CANONICAL_SITE_URL, WWW_SITE_HOST } from "./src/constants/site";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "www.tradingview.com",
      },
      {
        protocol: "https",
        hostname: "s3.tradingview.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: WWW_SITE_HOST }],
        destination: `${CANONICAL_SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
  experimental: {
    // typedRoutes disabled until all route pages exist
  },
};

export default nextConfig;

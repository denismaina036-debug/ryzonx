import type { NextConfig } from "next";

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
  experimental: {
    // typedRoutes disabled until all route pages exist
  },
};

export default nextConfig;

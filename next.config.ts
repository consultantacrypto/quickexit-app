import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // afterFiles: public/bmk/*.png is served first; only the page path is rewritten.
      afterFiles: [
        { source: "/bmk", destination: "/ro/bmk" },
        { source: "/bmk/", destination: "/ro/bmk" },
        { source: "/dealeri", destination: "/ro/dealeri" },
        { source: "/dealeri/", destination: "/ro/dealeri" },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "geywuzwbzecknokvnins.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);

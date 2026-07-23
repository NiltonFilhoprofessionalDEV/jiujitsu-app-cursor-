import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  customWorkerSrc: "worker",
  fallbacks: {
    // Static offline page — avoid looping a failing /home document fetch
    document: "/offline.html",
  },
});

const nextConfig: NextConfig = {
  // next-pwa injects webpack; empty turbopack config silences Next 16 warning
  turbopack: {},
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default withPWA(nextConfig);

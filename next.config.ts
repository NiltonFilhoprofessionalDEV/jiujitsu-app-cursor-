import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/home",
  },
});

const nextConfig: NextConfig = {
  // next-pwa injects webpack; empty turbopack config silences Next 16 warning
  turbopack: {},
};

export default withPWA(nextConfig);

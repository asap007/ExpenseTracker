import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // This disables type checking during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Disable TypeScript type checking
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint checking
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
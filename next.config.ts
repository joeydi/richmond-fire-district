import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right'
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5MB",
    },
  },
  // Sign-in and password reset requests live on the homepage now
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/forgot-password", destination: "/?view=forgot", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;

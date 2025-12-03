import type { NextConfig } from "next";

const backendRewriteTarget =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://exaclidraw-4.onrender.com";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/canvas/demo",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/auth/v1/:path*",
        destination: `${backendRewriteTarget}/auth/v1/:path*`,
      },
      {
        source: "/room/:path*",
        destination: `${backendRewriteTarget}/room/:path*`,
      },
      {
        source: "/chat/:path*",
        destination: `${backendRewriteTarget}/chat/:path*`,
      },
    ];
  },
};

export default nextConfig;

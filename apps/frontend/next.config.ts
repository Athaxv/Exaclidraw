import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        destination: "http://localhost:5000/auth/v1/:path*",
      },
      {
        source: "/room/:path*",
        destination: "http://localhost:5000/room/:path*",
      },
      {
        source: "/chat/:path*",
        destination: "http://localhost:5000/chat/:path*",
      },
    ];
  },
};

export default nextConfig;

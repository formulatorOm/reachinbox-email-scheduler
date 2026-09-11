import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/admin/queues/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://enthusiastic-clarity-production.up.railway.app'}/admin/queues/:path*`,
      },
    ];
  },
};

export default nextConfig;

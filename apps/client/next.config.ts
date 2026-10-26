import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { allowedOrigins: ['localhost:3002'] } },
}

export default nextConfig

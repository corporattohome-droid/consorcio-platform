/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@consorcio/shared', '@consorcio/ui'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig

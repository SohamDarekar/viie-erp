/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Disable image optimization for self-hosted deployment
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
